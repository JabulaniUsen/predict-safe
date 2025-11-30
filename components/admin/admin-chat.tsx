'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Send, Loader2, Search, MessageCircle } from 'lucide-react'
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

interface UserWithMessages {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  unread_count: number
  last_message_at: string
  last_message: string
}

export function AdminChat() {
  const [users, setUsers] = useState<UserWithMessages[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  const [isUserTyping, setIsUserTyping] = useState(false)
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

  useEffect(() => {
    const loadAdmin = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        toast.error('Please log in')
        return
      }

      // Verify admin
      const { data: profile } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', authUser.id)
        .single()

      if (!(profile as any)?.is_admin) {
        toast.error('Unauthorized')
        return
      }

      setAdminUser(authUser)
    }

    loadAdmin()
  }, [])

  const loadUsers = useCallback(async () => {
    if (!adminUser) return
    
    const supabase = createClient()
    setLoading(true)

    // Get all unique users who have sent messages
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select('user_id, sender_id, created_at, content, read')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load users')
      setLoading(false)
      return
    }

    // Group messages by user_id
    const userMap = new Map<string, {
      unread_count: number
      last_message_at: string
      last_message: string
    }>()

    messagesData?.forEach((msg: any) => {
      const existing = userMap.get(msg.user_id) || {
        unread_count: 0,
        last_message_at: msg.created_at,
        last_message: msg.content,
      }

      if (!msg.read && msg.sender_id !== adminUser.id) {
        existing.unread_count++
      }

      if (new Date(msg.created_at) > new Date(existing.last_message_at)) {
        existing.last_message_at = msg.created_at
        existing.last_message = msg.content
      }

      userMap.set(msg.user_id, existing)
    })

    // Get user details
    const userIds = Array.from(userMap.keys())
    if (userIds.length === 0) {
      setUsers([])
      setLoading(false)
      return
    }

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      toast.error('Failed to load users')
      setLoading(false)
      return
    }

    const usersWithMessages: UserWithMessages[] = (usersData || []).map((user: any) => {
      const msgData = userMap.get(user.id) || {
        unread_count: 0,
        last_message_at: '',
        last_message: '',
      }
      return {
        ...user,
        ...msgData,
      }
    }).sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )

    setUsers(usersWithMessages)
    setLoading(false)
  }, [adminUser])

  useEffect(() => {
    if (adminUser) {
      loadUsers()
    }
  }, [adminUser, loadUsers])

  useEffect(() => {
    if (!selectedUserId || !adminUser) return

    const loadMessages = async () => {
      const supabase = createClient()

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id(id, full_name, email, avatar_url, is_admin)
        `)
        .eq('user_id', selectedUserId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        toast.error('Failed to load messages')
      } else {
        setMessages(messagesData || [])
        
        // Mark messages as read
        const unreadIds = messagesData
          ?.filter((m: any) => !m.read && m.sender_id !== adminUser.id)
          .map((m: any) => m.id) || []
        
        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            // @ts-expect-error - Supabase type inference issue
            .update({ read: true })
            .in('id', unreadIds)
          
          // Reload users to update unread counts
          loadUsers()
        }
      }
    }

    loadMessages()

    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    let reconnectTimer: NodeJS.Timeout | null = null
    let heartbeatInterval: NodeJS.Timeout | null = null

    const setupRealtimeSubscription = () => {
      setConnectionStatus('connecting')
      const supabase = createClient()
      const channelName = `admin-messages-${selectedUserId}-${Date.now()}`
      
      // Set up separate typing channel
      const typingChannel = supabase.channel(`typing-${selectedUserId}`, {
        config: {
          broadcast: { self: true }
        }
      })
      
      typingChannel
        .on('broadcast', { event: 'typing' }, (payload) => {
          // User is typing
          if (payload.payload.user_id === selectedUserId && !payload.payload.is_admin && payload.payload.typing) {
            setIsUserTyping(true)
            
            // Clear typing indicator after 3 seconds of no activity
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current)
            }
            typingTimeoutRef.current = setTimeout(() => {
              setIsUserTyping(false)
            }, 3000)
          } else if (payload.payload.user_id === selectedUserId && !payload.payload.is_admin && !payload.payload.typing) {
            setIsUserTyping(false)
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
            presence: { key: adminUser.id }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `user_id=eq.${selectedUserId}`,
          },
          async (payload) => {
            console.log('Admin real-time event received:', payload.eventType, payload.new)
            
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
                    const exists = prev.find((m: any) => m.id === messageWithSender.id)
                    if (exists) {
                      return prev.map((m: any) => m.id === messageWithSender.id ? messageWithSender : m)
                    }
                    return [...prev, messageWithSender].sort((a: any, b: any) => 
                      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    )
                  })

                  // Mark as read if it's from admin
                  if (messageWithSender.sender_id === adminUser.id && !messageWithSender.read) {
                    await supabase
                      .from('messages')
                      // @ts-expect-error - Supabase type inference issue
                      .update({ read: true })
                      .eq('id', messageWithSender.id)
                  }

                  // Reload users to update unread counts
                  loadUsers()
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
                    if ((messageData as any).sender_id === adminUser.id && !(messageData as any).read) {
                      await supabase
                        .from('messages')
                        // @ts-expect-error - Supabase type inference issue
                        .update({ read: true })
                        .eq('id', (messageData as any).id)
                    }

                    // Reload users to update unread counts
                    loadUsers()
                  }
                }
              } catch (error) {
                console.error('Error processing real-time message:', error)
              }
            }
          }
        )
        .subscribe((status, err) => {
          console.log('Admin subscription status:', status)
          
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to admin messages via WebSocket')
            setConnectionStatus('connected')
            reconnectAttempts = 0 // Reset on successful connection
            
            // Set up heartbeat to keep connection alive
            heartbeatInterval = setInterval(() => {
              channel.send({
                type: 'presence',
                event: 'heartbeat',
                payload: { admin_id: adminUser.id, user_id: selectedUserId, timestamp: Date.now() }
              })
            }, 30000) // Send heartbeat every 30 seconds
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnectionStatus('disconnected')
            console.error('Admin WebSocket connection error:', status, err)
            
            // Clear heartbeat
            if (heartbeatInterval) {
              clearInterval(heartbeatInterval)
              heartbeatInterval = null
            }
            
            // Attempt reconnection with exponential backoff
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Max 30 seconds
              
              console.log(`Admin reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`)
              
              reconnectTimer = setTimeout(() => {
                setupRealtimeSubscription()
              }, delay)
            } else {
              console.error('Max reconnection attempts reached. Falling back to polling.')
              // Fallback to polling every 5 seconds
              const pollInterval = setInterval(() => {
                loadMessages()
              }, 5000)
              
              return () => clearInterval(pollInterval)
            }
          }
        })

      return channel
    }

    const channel = setupRealtimeSubscription()

    return () => {
      console.log('Cleaning up admin WebSocket subscription')
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current)
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      const supabase = createClient()
      if (channel) {
        supabase.removeChannel(channel)
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current)
      }
    }
  }, [selectedUserId, adminUser?.id, loadUsers])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !selectedUserId || !adminUser) return

    setSending(true)
    const supabase = createClient()
    const messageContent = newMessage.trim()

    const { data: newMessageData, error } = await supabase
      .from('messages')
      // @ts-expect-error - Supabase type inference issue
      .insert({
        user_id: selectedUserId,
        sender_id: adminUser.id,
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
      if (typingChannelRef.current && selectedUserId) {
        typingChannelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            user_id: selectedUserId,
            is_admin: true,
            typing: false
          }
        })
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current)
      }
      
      // Reload users to update unread counts
      loadUsers()
    }

    setSending(false)
  }

  const selectedUser = users.find(u => u.id === selectedUserId)

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.email.toLowerCase().includes(query) ||
      (user.full_name?.toLowerCase().includes(query) || false)
    )
  })

  if (loading && !adminUser) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Users List */}
      <Card className="w-80 flex flex-col h-full">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-lg">Conversations</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0 min-h-0">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredUsers.map((user) => {
                const userName = user.full_name || user.email.split('@')[0]
                const userInitial = userName.charAt(0).toUpperCase()

                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedUserId === user.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={userName}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {userInitial}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">{userName}</p>
                          {user.unread_count > 0 && (
                            <span className="bg-red-600 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {user.unread_count > 9 ? '9+' : user.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{user.last_message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(user.last_message_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col h-full">
        {selectedUser ? (
          <>
            <CardHeader className="border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedUser.avatar_url ? (
                    <Image
                      src={selectedUser.avatar_url}
                      alt={selectedUser.full_name || selectedUser.email}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">
                      {selectedUser.full_name || selectedUser.email.split('@')[0]}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
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
                        Start the conversation by sending a message
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender_id === adminUser?.id
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
                            {message.sender?.avatar_url ? (
                              <Image
                                src={message.sender.avatar_url}
                                alt={senderName}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {senderInitial}
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          <div className={`rounded-lg px-4 py-2 ${
                            isOwnMessage
                              ? 'bg-red-600 text-white'
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
                            <Image
                              src="/logo.png"
                              alt="Admin"
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover border-2 border-red-600"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                {isUserTyping && selectedUser && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0">
                      {selectedUser.avatar_url ? (
                        <Image
                          src={selectedUser.avatar_url}
                          alt={selectedUser.full_name || selectedUser.email}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {(selectedUser.full_name || selectedUser.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
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
                      
                      if (e.target.value.trim() && typingChannelRef.current && selectedUserId) {
                        typingDebounceRef.current = setTimeout(() => {
                          typingChannelRef.current?.send({
                            type: 'broadcast',
                            event: 'typing',
                            payload: {
                              user_id: selectedUserId,
                              is_admin: true,
                              typing: true
                            }
                          })
                        }, 500) // Wait 500ms before sending typing indicator
                      } else if (!e.target.value.trim() && typingChannelRef.current && selectedUserId) {
                        typingChannelRef.current.send({
                          type: 'broadcast',
                          event: 'typing',
                          payload: {
                            user_id: selectedUserId,
                            is_admin: true,
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
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">Select a conversation to start chatting</p>
              <p className="text-sm text-gray-400">
                Choose a user from the list to view and respond to their messages
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

