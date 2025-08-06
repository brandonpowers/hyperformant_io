"use client"

import useScroll from "lib/use-scroll"
import { cx } from "lib/utils"
import { RiCloseLine, RiMenuLine } from "@remixicon/react"
import Link from "next/link"
import React from "react"
import { Button } from "../ui/Button"
import Image from "next/image"
import logoDark from '/public/logos/logo-dark.svg'
import logoLight from '/public/logos/logo-light.svg'

export function Navigation() {
  const scrolled = useScroll(15)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery: MediaQueryList = window.matchMedia("(min-width: 768px)")
    const handleMediaQueryChange = () => {
      setOpen(false)
    }

    mediaQuery.addEventListener("change", handleMediaQueryChange)
    handleMediaQueryChange()

    return () => {
      mediaQuery.removeEventListener("change", handleMediaQueryChange)
    }
  }, [])

  return (
    <header
      className={cx(
        "fixed inset-x-3 top-4 z-50 mx-auto flex max-w-6xl transform-gpu animate-slide-down-fade justify-center overflow-hidden rounded-xl px-3 py-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1.03)] will-change-transform",
        open === true ? "h-52" : "h-16",
        scrolled || open === true
          ? "backdrop-blur-nav max-w-3xl border border-gray-100 bg-white/80 shadow-xl dark:border-white/15 dark:bg-black/70"
          : "bg-white/0 dark:bg-gray-950/0",
      )}
    >
      <div className="w-full md:my-auto">
        <div className="relative flex items-center justify-between">
          <Link href="/" aria-label="Home">
            <span className="sr-only">Hyperformant logo</span>
            <Image
              src={logoLight}
              alt="Hyperformant"
              width={120}
              height={40}
              className="h-8 w-auto dark:hidden"
            />
            <Image
              src={logoDark}
              alt="Hyperformant"
              width={120}
              height={40}
              className="hidden h-8 w-auto dark:block"
            />
          </Link>
          <nav className="hidden md:absolute md:left-1/2 md:top-1/2 md:block md:-translate-x-1/2 md:-translate-y-1/2 md:transform">
            <div className="flex items-center gap-10 font-medium">
              <Link
                className="px-2 py-1 text-gray-900 dark:text-gray-50"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <Link
                className="px-2 py-1 text-gray-900 dark:text-gray-50"
                href="#pricing"
              >
                Pricing
              </Link>
              <Link
                className="px-2 py-1 text-gray-900 dark:text-gray-50"
                href="/about"
              >
                About
              </Link>
            </div>
          </nav>
          <Button className="hidden h-10 font-semibold md:flex" asChild href="/auth/sign-up">
            Start Free Trial
          </Button>
          <div className="flex gap-x-2 md:hidden">
            <Button asChild href="/auth/sign-up">Start Trial</Button>
            <Button
              onClick={() => setOpen(!open)}
              variant="light"
              className="aspect-square p-2"
            >
              {open ? (
                <RiCloseLine aria-hidden="true" className="size-5" />
              ) : (
                <RiMenuLine aria-hidden="true" className="size-5" />
              )}
            </Button>
          </div>
        </div>
        <nav
          className={cx(
            "my-6 flex text-lg ease-in-out will-change-transform md:hidden",
            open ? "" : "hidden",
          )}
        >
          <ul className="space-y-4 font-medium">
            <li onClick={() => setOpen(false)}>
              <Link href="/dashboard">Dashboard</Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="#pricing">Pricing</Link>
            </li>
            <li onClick={() => setOpen(false)}>
              <Link href="/about">About</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}