import React, { useState, useEffect } from 'react'

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: string
  features: string[]
  recommended?: boolean
}

interface UserSubscription {
  active: boolean
  plan_name?: string
  next_billing_date?: string
  status?: string
}

const Subscription: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)

  useEffect(() => {
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    try {
      // Load available plans and user's current subscription
      const [plansResponse, userSubResponse] = await Promise.all([
        fetch('/api/subscription/plans'),
        fetch('/api/subscription/status', { credentials: 'include' })
      ])

      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setPlans(plansData.plans || getDefaultPlans())
      } else {
        setPlans(getDefaultPlans())
      }

      if (userSubResponse.ok) {
        const userSubData = await userSubResponse.json()
        setUserSubscription(userSubData)
      }
    } catch (error) {
      console.error('Error loading subscription data:', error)
      setPlans(getDefaultPlans())
    } finally {
      setLoading(false)
    }
  }

  const getDefaultPlans = (): SubscriptionPlan[] => [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: 'forever',
      features: [
        '5 AI questions per day',
        'Basic quiz access',
        'Limited progress tracking',
        'Community support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 9.99,
      interval: 'month',
      recommended: true,
      features: [
        'Unlimited AI questions',
        'Advanced adaptive quizzes',
        'Detailed analytics',
        'Voice input support',
        'Priority support',
        'Personalized learning paths'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 99.99,
      interval: 'year',
      features: [
        'Everything in Pro',
        'One-on-one AI tutoring sessions',
        'Custom learning materials',
        'Advanced progress reports',
        'Early access to new features',
        'Dedicated account manager'
      ]
    }
  ]

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return
    
    setProcessingPlan(planId)
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ plan_id: planId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()
      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout process. Please try again.')
    } finally {
      setProcessingPlan(null)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to access customer portal')
      }

      const data = await response.json()
      window.location.href = data.portal_url
    } catch (error) {
      console.error('Error accessing customer portal:', error)
      alert('Failed to access subscription management. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Learning Plan</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Unlock the full potential of AI-powered learning with our flexible subscription plans
        </p>
      </div>

      {/* Current Subscription Status */}
      {userSubscription && userSubscription.active && (
        <div className="card mb-8 bg-gradient-to-r from-primary-50 to-primary-100">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
                  <i className="fas fa-crown text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Active Subscription: {userSubscription.plan_name}
                  </h3>
                  <p className="text-gray-600">
                    Status: <span className="capitalize text-green-600 font-medium">{userSubscription.status}</span>
                    {userSubscription.next_billing_date && (
                      <span className="ml-4">
                        Next billing: {new Date(userSubscription.next_billing_date).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleManageSubscription}
                className="btn btn-outline"
              >
                <i className="fas fa-cog mr-2"></i>
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`card relative ${
              plan.recommended 
                ? 'ring-2 ring-primary-500 shadow-lg transform scale-105' 
                : ''
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="card-header text-center">
              <h3 className="card-title text-xl">{plan.name}</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">
                  ${plan.price}
                </span>
                <span className="text-gray-600">/{plan.interval}</span>
              </div>
            </div>

            <div className="card-content">
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-500 mt-1 flex-shrink-0"></i>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={
                  processingPlan === plan.id || 
                  (userSubscription?.active && userSubscription.plan_name?.toLowerCase() === plan.name.toLowerCase())
                }
                className={`btn w-full ${
                  plan.recommended 
                    ? 'btn-primary' 
                    : plan.id === 'free' 
                      ? 'btn-outline' 
                      : 'btn-secondary'
                } ${
                  userSubscription?.active && userSubscription.plan_name?.toLowerCase() === plan.name.toLowerCase()
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                {processingPlan === plan.id ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Processing...
                  </>
                ) : userSubscription?.active && userSubscription.plan_name?.toLowerCase() === plan.name.toLowerCase() ? (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    Current Plan
                  </>
                ) : plan.id === 'free' ? (
                  'Get Started'
                ) : (
                  'Subscribe Now'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Features Comparison */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Feature Comparison</h2>
        <div className="card">
          <div className="card-content overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Feature</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Free</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Pro</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-3 px-4">AI Questions per Day</td>
                  <td className="text-center py-3 px-4">5</td>
                  <td className="text-center py-3 px-4">Unlimited</td>
                  <td className="text-center py-3 px-4">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Voice Input</td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-times text-red-500"></i>
                  </td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-check text-green-500"></i>
                  </td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-check text-green-500"></i>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Advanced Analytics</td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-times text-red-500"></i>
                  </td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-check text-green-500"></i>
                  </td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-check text-green-500"></i>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Priority Support</td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-times text-red-500"></i>
                  </td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-check text-green-500"></i>
                  </td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-check text-green-500"></i>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Personal Tutoring Sessions</td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-times text-red-500"></i>
                  </td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-times text-red-500"></i>
                  </td>
                  <td className="text-center py-3 px-4">
                    <i className="fas fa-check text-green-500"></i>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-content">
              <h3 className="font-semibold mb-2">Can I change my plan anytime?</h3>
              <p className="text-gray-600 text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-gray-600 text-sm">
                You can start with our free plan to explore the platform. Upgrade anytime to unlock more features.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <h3 className="font-semibold mb-2">How does billing work?</h3>
              <p className="text-gray-600 text-sm">
                We charge automatically on a monthly or yearly basis depending on your chosen plan. You can cancel anytime.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm">
                We accept all major credit cards, debit cards, and digital wallets through our secure Stripe integration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Subscription
