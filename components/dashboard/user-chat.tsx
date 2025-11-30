'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'

interface Message {
  id: string
  user_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
  sender?: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
    is_admin: boolean
  }
}

export function UserChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  const [isAdminTyping, setIsAdminTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const typingChannelRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadUserAndMessages = async () => {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    if (!authUser) {
      toast.error('Please log in to use chat')
      return
    }

    setUser(authUser)

    // Fetch messages
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id(id, full_name, email, avatar_url, is_admin)
      `)
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } else {
      setMessages(messagesData || [])
      
      // Mark messages as read
      const unreadIds = messagesData
        ?.filter((m: any) => !m.read && m.sender_id !== authUser.id)
        .map((m: any) => m.id) || []
      
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          // @ts-expect-error - Supabase type inference issue
          .update({ read: true })
          .in('id', unreadIds)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadUserAndMessages()
  }, [])

  useEffect(() => {
    if (!user?.id) return

    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    let reconnectTimer: NodeJS.Timeout | null = null
    let heartbeatInterval: NodeJS.Timeout | null = null

    const setupRealtimeSubscription = () => {
      setConnectionStatus('connecting')
      const supabase = createClient()
      const channelName = `messages-${user.id}-${Date.now()}`
      
      // Set up separate typing channel
      const typingChannel = supabase.channel(`typing-${user.id}`, {
        config: {
          broadcast: { self: true }
        }
      })
      
      typingChannel
        .on('broadcast', { event: 'typing' }, (payload) => {
          // Admin is typing
          if (payload.payload.user_id === user.id && payload.payload.is_admin && payload.payload.typing) {
            setIsAdminTyping(true)
            
            // Clear typing indicator after 3 seconds of no activity
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current)
            }
            typingTimeoutRef.current = setTimeout(() => {
              setIsAdminTyping(false)
            }, 3000)
          } else if (payload.payload.user_id === user.id && payload.payload.is_admin && !payload.payload.typing) {
            setIsAdminTyping(false)
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current)
            }
          }
        })
        .subscribe()
      
      typingChannelRef.current = typingChannel
      
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: true },
            presence: { key: user.id }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('Real-time event received:', payload.eventType, payload.new)
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              try {
                const newMessage = payload.new as any
                
                // For INSERT, try to use payload data directly first, then fetch if needed
                if (payload.eventType === 'INSERT' && newMessage) {
                  // Fetch sender info for the new message
                  const { data: senderData } = await supabase
                    .from('users')
                    .select('id, full_name, email, avatar_url, is_admin')
                    .eq('id', newMessage.sender_id)
                    .single()

                  const messageWithSender = {
                    ...newMessage,
                    sender: senderData || null
                  }

                  setMessages((prev) => {
                    const exists = prev.find((m: any) => m.id === (messageWithSender as any).id)
                    if (exists) {
                      return prev.map((m: any) => m.id === (messageWithSender as any).id ? messageWithSender : m)
                    }
                    return [...prev, messageWithSender].sort((a: any, b: any) => 
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    )
                  })

                  // Mark as read if it's from admin
                  if (messageWithSender.sender_id !== user.id && !messageWithSender.read) {
                    await supabase
                      .from('messages')
                      // @ts-expect-error - Supabase type inference issue
                      .update({ read: true })
                      .eq('id', messageWithSender.id)
                  }
                } else {
                  // For UPDATE or if INSERT payload is incomplete, fetch full message
                  const { data: messageData, error: fetchError } = await supabase
                    .from('messages')
                    .select(`
                      *,
                      sender:users!sender_id(id, full_name, email, avatar_url, is_admin)
                    `)
                    .eq('id', newMessage.id)
                    .single()

                  if (fetchError) {
                    console.error('Error fetching message:', fetchError)
                    return
                  }

                  if (messageData) {
                    setMessages((prev) => {
                      const exists = prev.find((m: any) => m.id === (messageData as any).id)
                      if (exists) {
                        return prev.map((m: any) => m.id === (messageData as any).id ? messageData : m)
                      }
                      return [...prev, messageData].sort((a: any, b: any) => 
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                      )
                    })

                    // Mark as read if it's from admin
                    if ((messageData as any).sender_id !== user.id && !(messageData as any).read) {
                      await supabase
                        .from('messages')
                        // @ts-expect-error - Supabase type inference issue
                        .update({ read: true })
                        .eq('id', (messageData as any).id)
                    }
                  }
                }
              } catch (error) {
                console.error('Error processing real-time message:', error)
              }
            }
          }
        )
        .subscribe((status, err) => {
          console.log('Subscription status:', status)
          
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to messages via WebSocket')
            setConnectionStatus('connected')
            reconnectAttempts = 0 // Reset on successful connection
            
            // Set up heartbeat to keep connection alive
            heartbeatInterval = setInterval(() => {
              channel.send({
                type: 'presence',
                event: 'heartbeat',
                payload: { user_id: user.id, timestamp: Date.now() }
              })
            }, 30000) // Send heartbeat every 30 seconds
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnectionStatus('disconnected')
            console.error('WebSocket connection error:', status, err)
            
            // Clear heartbeat
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval)
              heartbeatInterval = null
            }
            
            // Attempt reconnection with exponential backoff
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Max 30 seconds
              
              console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`)
              
              reconnectTimer = setTimeout(() => {
                setupRealtimeSubscription()
              }, delay)
            } else {
              console.error('Max reconnection attempts reached. Falling back to polling.')
              // Fallback to polling every 5 seconds
              const pollInterval = setInterval(() => {
                loadUserAndMessages()
              }, 5000)
              
              return () => clearInterval(pollInterval)
            }
          }
        })

      return channel
    }

    const channel = setupRealtimeSubscription()

    return () => {
      console.log('Cleaning up WebSocket subscription')
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current)
      }
      const supabase = createClient()
      if (channel) {
        supabase.removeChannel(channel)
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current)
      }
    }
  }, [user?.id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !user) return

    setSending(true)
    const supabase = createClient()
    const messageContent = newMessage.trim()

    const { data: newMessageData, error } = await supabase
      .from('messages')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        user_id: user.id,
        sender_id: user.id,
        content: messageContent,
      })
      .select(`
        *,
        sender:users!sender_id(id, full_name, email, avatar_url, is_admin)
      `)
      .single()

    if (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } else {
      // Optimistically add the message to the UI
      if (newMessageData) {
        setMessages((prev) => [...prev, newMessageData].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ))
      }
      setNewMessage('')
      toast.success('Message sent!')
      
      // Stop typing indicator
      if (typingChannelRef.current) {
        typingChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: user.id,
            is_admin: false,
            typing: false
          }
        })
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current)
      }
    }

    setSending(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <Card className="h-[calc(100vh-200px)] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Chat with Admin</CardTitle>
            <p className="text-sm text-muted-foreground">
              Send a message to the admin team. We'll respond as soon as possible.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <span className="text-xs text-muted-foreground">
              {connectionStatus === 'connected' ? 'Online' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               'Offline'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-gray-500 mb-2">No messages yet</p>
                <p className="text-sm text-gray-400">
                  Start a conversation by sending a message below
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === user?.id
              const senderName = message.sender?.is_admin 
                ? 'Admin' 
                : message.sender?.full_name || message.sender?.email?.split('@')[0] || 'User'
              const senderInitial = senderName.charAt(0).toUpperCase()

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwnMessage && (
                    <div className="flex-shrink-0">
                      {message.sender?.is_admin ? (
                        <Image
                          src="/logo.png"
                          alt="Admin"
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#1e40af]"
                        />
                      ) : message.sender?.avatar_url ? (
                        <Image
                          src={message.sender.avatar_url}
                          alt={senderName}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {senderInitial}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-lg px-4 py-2 ${
                      isOwnMessage
                        ? 'bg-[#1e40af] text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 px-1">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {isOwnMessage && (
                    <div className="flex-shrink-0">
                      {user?.user_metadata?.avatar_url ? (
                        <Image
                          src={user.user_metadata.avatar_url}
                          alt="You"
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
          {isAdminTyping && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="Admin"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#1e40af]"
                />
              </div>
              <div className="flex flex-col items-start">
                <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                
                // Debounce typing indicator
                if (typingDebounceRef.current) {
                  clearTimeout(typingDebounceRef.current)
                }
                
                if (e.target.value.trim() && typingChannelRef.current) {
                  typingDebounceRef.current = setTimeout(() => {
                    typingChannelRef.current?.send({
                      type: 'broadcast',
                      event: 'typing',
                      payload: {
                        user_id: user.id,
                        is_admin: false,
                        typing: true
                      }
                    })
                  }, 500) // Wait 500ms before sending typing indicator
                } else if (!e.target.value.trim() && typingChannelRef.current) {
                  typingChannelRef.current.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: {
                      user_id: user.id,
                      is_admin: false,
                      typing: false
                    }
                  })
                }
              }}
              placeholder="Type your message..."
              className="min-h-[60px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="self-end"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}

