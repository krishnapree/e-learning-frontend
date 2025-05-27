import os
import stripe
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from models import User, Subscription

class StripeService:
    def __init__(self):
        self.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_default_key")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_default_secret")
        self.success_url = os.getenv("FRONTEND_URL", "http://localhost:5000") + "/subscription?success=true"
        self.cancel_url = os.getenv("FRONTEND_URL", "http://localhost:5000") + "/subscription?canceled=true"
        
        stripe.api_key = self.api_key
    
    def get_subscription_plans(self) -> List[Dict]:
        """
        Get available subscription plans.
        In a real implementation, these would be fetched from Stripe.
        """
        return [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "interval": "forever",
                "features": [
                    "5 AI questions per day",
                    "Basic quiz access",
                    "Limited progress tracking",
                    "Community support"
                ]
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 9.99,
                "interval": "month",
                "stripe_price_id": "price_pro_monthly",
                "recommended": True,
                "features": [
                    "Unlimited AI questions",
                    "Advanced adaptive quizzes",
                    "Detailed analytics",
                    "Voice input support",
                    "Priority support",
                    "Personalized learning paths"
                ]
            },
            {
                "id": "premium",
                "name": "Premium",
                "price": 99.99,
                "interval": "year",
                "stripe_price_id": "price_premium_yearly",
                "features": [
                    "Everything in Pro",
                    "One-on-one AI tutoring sessions",
                    "Custom learning materials",
                    "Advanced progress reports",
                    "Early access to new features",
                    "Dedicated account manager"
                ]
            }
        ]
    
    async def create_checkout_session(self, customer_email: str, plan_id: str) -> str:
        """
        Create a Stripe checkout session for subscription.
        """
        try:
            plans = self.get_subscription_plans()
            plan = next((p for p in plans if p["id"] == plan_id), None)
            
            if not plan or plan_id == "free":
                raise ValueError("Invalid plan selected")
            
            # Create or get customer
            customer = await self._get_or_create_customer(customer_email)
            
            session = stripe.checkout.Session.create(
                customer=customer.id,
                payment_method_types=['card'],
                line_items=[{
                    'price': plan.get("stripe_price_id", "price_default"),
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=self.success_url,
                cancel_url=self.cancel_url,
                allow_promotion_codes=True,
                billing_address_collection='required',
                metadata={
                    'plan_id': plan_id,
                    'customer_email': customer_email
                }
            )
            
            return session.url
            
        except Exception as e:
            raise Exception(f"Failed to create checkout session: {str(e)}")
    
    async def create_customer_portal_session(self, customer_id: str) -> str:
        """
        Create a customer portal session for subscription management.
        """
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=os.getenv("FRONTEND_URL", "http://localhost:5000") + "/subscription"
            )
            
            return session.url
            
        except Exception as e:
            raise Exception(f"Failed to create portal session: {str(e)}")
    
    async def _get_or_create_customer(self, email: str):
        """
        Get existing Stripe customer or create a new one.
        """
        try:
            # Try to find existing customer
            customers = stripe.Customer.list(email=email, limit=1)
            
            if customers.data:
                return customers.data[0]
            else:
                # Create new customer
                return stripe.Customer.create(email=email)
                
        except Exception as e:
            raise Exception(f"Failed to handle customer: {str(e)}")
    
    def verify_webhook(self, payload: bytes, sig_header: str):
        """
        Verify Stripe webhook signature and return event.
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            return event
        except ValueError as e:
            raise Exception(f"Invalid payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            raise Exception(f"Invalid signature: {str(e)}")
    
    def handle_webhook_event(self, db: Session, event: Dict):
        """
        Handle Stripe webhook events.
        """
        event_type = event['type']
        
        if event_type == 'checkout.session.completed':
            self._handle_checkout_completed(db, event['data']['object'])
        elif event_type == 'invoice.payment_succeeded':
            self._handle_payment_succeeded(db, event['data']['object'])
        elif event_type == 'customer.subscription.updated':
            self._handle_subscription_updated(db, event['data']['object'])
        elif event_type == 'customer.subscription.deleted':
            self._handle_subscription_deleted(db, event['data']['object'])
    
    def _handle_checkout_completed(self, db: Session, session):
        """
        Handle completed checkout session.
        """
        try:
            customer_email = session.get('customer_details', {}).get('email') or session.get('metadata', {}).get('customer_email')
            customer_id = session['customer']
            subscription_id = session['subscription']
            
            # Find user by email
            user = db.query(User).filter(User.email == customer_email).first()
            if not user:
                return
            
            # Create or update subscription record
            subscription = db.query(Subscription).filter(Subscription.user_id == user.id).first()
            
            if not subscription:
                subscription = Subscription(
                    user_id=user.id,
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id,
                    active_status=True,
                    status='active'
                )
                db.add(subscription)
            else:
                subscription.stripe_customer_id = customer_id
                subscription.stripe_subscription_id = subscription_id
                subscription.active_status = True
                subscription.status = 'active'
            
            # Update user subscription status
            user.subscription_status = 'pro'  # Default to pro for paid subscriptions
            
            db.commit()
            
        except Exception as e:
            print(f"Error handling checkout completion: {e}")
            db.rollback()
    
    def _handle_payment_succeeded(self, db: Session, invoice):
        """
        Handle successful payment.
        """
        try:
            customer_id = invoice['customer']
            subscription_id = invoice['subscription']
            
            subscription = db.query(Subscription).filter(
                Subscription.stripe_customer_id == customer_id
            ).first()
            
            if subscription:
                subscription.active_status = True
                subscription.status = 'active'
                
                # Update billing dates
                if invoice.get('period_end'):
                    subscription.next_billing_date = datetime.fromtimestamp(invoice['period_end'])
                
                db.commit()
                
        except Exception as e:
            print(f"Error handling payment success: {e}")
            db.rollback()
    
    def _handle_subscription_updated(self, db: Session, stripe_subscription):
        """
        Handle subscription updates.
        """
        try:
            customer_id = stripe_subscription['customer']
            status = stripe_subscription['status']
            
            subscription = db.query(Subscription).filter(
                Subscription.stripe_customer_id == customer_id
            ).first()
            
            if subscription:
                subscription.status = status
                subscription.active_status = status == 'active'
                
                # Update user subscription status
                if subscription.user:
                    if status == 'active':
                        subscription.user.subscription_status = subscription.plan_name or 'pro'
                    else:
                        subscription.user.subscription_status = 'free'
                
                db.commit()
                
        except Exception as e:
            print(f"Error handling subscription update: {e}")
            db.rollback()
    
    def _handle_subscription_deleted(self, db: Session, stripe_subscription):
        """
        Handle subscription cancellation.
        """
        try:
            customer_id = stripe_subscription['customer']
            
            subscription = db.query(Subscription).filter(
                Subscription.stripe_customer_id == customer_id
            ).first()
            
            if subscription:
                subscription.active_status = False
                subscription.status = 'canceled'
                
                # Update user subscription status
                if subscription.user:
                    subscription.user.subscription_status = 'free'
                
                db.commit()
                
        except Exception as e:
            print(f"Error handling subscription deletion: {e}")
            db.rollback()
