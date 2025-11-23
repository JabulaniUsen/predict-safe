'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, TrendingUp, Target, BarChart3, Clock, Zap } from 'lucide-react'

export function WhatWeOfferSection() {
  return (
    <section className="py-12 lg:py-20 bg-[#1e40af]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            PredictSafe – Where Winning is Guaranteed
          </h2>
          <p className="text-base lg:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
            Welcome to PredictSafe.com, your trusted partner for smarter, more profitable football betting.
          </p>
          <p className="text-base lg:text-lg text-white/90 max-w-3xl mx-auto mt-4 leading-relaxed">
            If you're tired of random guesses, empty promises, and tickets that always cut, you're finally in the right place.
          </p>
          <p className="text-base lg:text-lg text-white max-w-3xl mx-auto mt-4 leading-relaxed font-semibold">
            At PredictSafe, we don't rely on luck. We rely on data, expert analysis, and proven strategies, so every prediction we share is built to help you win.
          </p>
        </div>

        <div className="mb-12 lg:mb-16">
          <h3 className="text-2xl lg:text-3xl font-bold text-white text-center mb-8">What We Offer</h3>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            <Card className="border-2 border-white/20 bg-white hover:shadow-xl transition-shadow">
              <CardHeader className="p-5 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">1. Free Daily Predictions</CardTitle>
                </div>
                <CardDescription className="text-sm text-gray-600">
                  Perfect for beginners or anyone who wants to test our accuracy before going VIP.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Every day, we publish carefully analyzed free tips from top global leagues.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-white/20 bg-white hover:shadow-xl transition-shadow">
              <CardHeader className="p-5 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">2. VIP (Premium) Predictions</CardTitle>
                </div>
                <CardDescription className="text-sm text-gray-600">
                  90% Accuracy (Standard plan) - Where precision meets profit.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-sm text-gray-700 leading-relaxed mb-3">Our VIP predictions are built on:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                  <li>Advanced analytics</li>
                  <li>Verified sources</li>
                  <li>Expert match review</li>
                  <li>90%+ historical win rate</li>
                </ul>
                <p className="text-sm text-gray-700 mt-3">Designed for serious bettors who want consistent results.</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-white/20 bg-white hover:shadow-xl transition-shadow">
              <CardHeader className="p-5 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">3. Profit Multiplier Plan (VIP)</CardTitle>
                </div>
                <CardDescription className="text-sm text-gray-600">
                  High-value predictions for higher returns.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                  <li>Odds typically ranging from 2.80 to 4.30+</li>
                  <li>Professional accumulators curated by experts</li>
                  <li>Detailed breakdowns and match insights</li>
                  <li>Proven winning patterns</li>
                </ul>
                <p className="text-sm text-gray-700 mt-3">Ideal for users who want strategic profit growth.</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-white/20 bg-white hover:shadow-xl transition-shadow">
              <CardHeader className="p-5 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">4. Correct Score Package</CardTitle>
                </div>
                <CardDescription className="text-sm text-gray-600">
                  Premium Special Plan - Elite-tier with 95% accuracy.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  The Correct Score Package is our elite-tier plan, crafted for users who demand unmatched precision and consistent winning outcomes. This is one of PredictSafe's most exclusive offerings — designed to deliver ultra-accurate, deeply analyzed scoreline predictions with a proven 95% accuracy rate.
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Built for serious bettors, this plan gives you full access to highly curated correct score outcomes that deliver powerful results across major leagues worldwide.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-white/20 bg-white hover:shadow-xl transition-shadow">
              <CardHeader className="p-5 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">5. Daily 2+ Odds Package</CardTitle>
                </div>
                <CardDescription className="text-sm text-gray-600">
                  Safe and steady earning strategy.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                  <li>Curated daily 2+ odds</li>
                  <li>Expert-reviewed</li>
                  <li>Delivered fresh every morning</li>
                  <li>Perfect for controlled bankroll growth</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-white/20 bg-white hover:shadow-xl transition-shadow">
              <CardHeader className="p-5 border-b border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-red-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">6. Live Scores & Match Tracking</CardTitle>
                </div>
                <CardDescription className="text-sm text-gray-600">
                  Stay in control at every moment.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                  <li>Real-time match stats</li>
                  <li>Live tracking for active games</li>
                  <li>Match momentum insights</li>
                  <li>Helps you monitor slips and predictions instantly</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl lg:text-3xl font-bold text-white text-center mb-8">Why PredictSafe is Different</h3>
          <div className="space-y-4 text-base lg:text-lg text-white/90">
            <p className="leading-relaxed">
              At PredictSafe, we don't sell yesterday's success or promise magic:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Every tip is backed by data models, expert insight, and verified sources</li>
              <li>We analyze team form, injuries, head-to-head stats, and real match context</li>
              <li>Quality over quantity: only the best picks make it to your dashboard</li>
              <li>Transparent results and updates so you know exactly why we made each pick</li>
            </ul>
            <p className="leading-relaxed mt-6 font-semibold text-white">
              We're more than a prediction site — we're your strategic partner in football betting.
            </p>
          </div>

          <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-lg text-white text-center">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4">Ready to Start Winning Smarter?</h3>
            <p className="text-base lg:text-lg mb-6 opacity-90">
              Whether you want Free daily tips, High-accuracy VIP predictions, High-odds Profit Multiplier, Steady Daily 2 Odds, Or precise Correct Score predictions
            </p>
            <p className="text-lg lg:text-xl font-semibold">
              PredictSafe.com gives you everything you need to win — consistently.
            </p>
            <p className="text-xl lg:text-2xl font-bold mt-4">
              PredictSafe – Where Winning Is Guaranteed
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

