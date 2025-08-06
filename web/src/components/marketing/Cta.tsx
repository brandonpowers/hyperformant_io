"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Balancer from "react-wrap-balancer"
import InputField from 'components/ui/fields/InputField';

export default function Cta() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      // Store email in sessionStorage for the onboarding flow
      sessionStorage.setItem('onboarding_email', email)
      router.push('/onboarding/goals')
    }
  }

  return (
    <section
      aria-labelledby="cta-title"
      className="mx-auto mb-20 mt-32 max-w-6xl p-1 px-2 sm:mt-56"
    >
      <div className="relative flex items-center justify-center">
        <div
          className="mask pointer-events-none absolute -z-10 select-none opacity-70"
          aria-hidden="true"
        >
          <div className="flex size-full flex-col gap-2">
            {Array.from({ length: 20 }, (_, idx) => (
              <div key={`outer-${idx}`}>
                <div className="flex size-full gap-2">
                  {Array.from({ length: 41 }, (_, idx2) => (
                    <div key={`inner-${idx}-${idx2}`}>
                      <div className="size-5 rounded-md shadow shadow-indigo-500/20 ring-1 ring-black/5 dark:shadow-indigo-500/20 dark:ring-white/5"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-4xl">
          <div className="flex flex-col items-center justify-center text-center">
            <div>
              <h3
                id="cta-title"
                className="inline-block bg-gradient-to-t from-gray-900 to-gray-800 bg-clip-text p-2 text-4xl font-bold tracking-tighter text-transparent md:text-6xl dark:from-gray-50 dark:to-gray-300"
              >
                Ready to get started?
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 sm:text-lg dark:text-gray-400">
                <Balancer>
                  Launch a new cluster or migrate to Database with zero
                  downtime.
                </Balancer>
              </p>
            </div>
            <div className="mt-14 w-full rounded-[16px] bg-gray-300/5 p-1.5 ring-1 ring-black/[3%] backdrop-blur dark:bg-gray-900/10 dark:ring-white/[3%]">
              <div className="rounded-xl bg-white p-4 shadow-lg shadow-indigo-500/10 ring-1 ring-black/5 dark:bg-gray-950 dark:shadow-indigo-500/10 dark:ring-white/5">
                <form
                  className="flex flex-col items-center gap-3 sm:flex-row"
                  onSubmit={handleSubmit}
                >
                  <div className="h-10 w-full min-w-0 flex-auto">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="h-full w-full rounded-xl border border-gray-200 bg-white/0 px-3 text-sm outline-none transition duration-200 focus:border-brand-500 dark:border-white/10 dark:text-white dark:focus:border-brand-400"
                      placeholder="Your work email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="linear h-10 w-full rounded-xl bg-brand-500 px-6 text-center font-medium text-white transition duration-200 hover:bg-brand-600 sm:w-fit sm:flex-none"
                  >
                    Get started
                  </button>
                </form>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-600 sm:text-sm dark:text-gray-400">
              Not sure where to start?{" "}
              <a
                href="#"
                className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-500 dark:hover:text-indigo-400"
              >
                Talk to sales
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
