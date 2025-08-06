import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      isAdmin: boolean
      subscriptionStatus?: string | null
      subscriptionPlan?: string | null
      credits: number
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    isAdmin: boolean
    subscriptionStatus?: string | null
    subscriptionPlan?: string | null
    credits: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
  }
}