export default function LogoCloud() {
  const companies = [
    "Apollo.io", "Reddit", "Twitter", "G2", 
    "HackerNews", "OpenAI", "Anthropic", "Google AI"
  ]

  return (
    <section
      id="logo-cloud"
      aria-label="Platform integrations"
      className="mt-24 flex animate-slide-up-fade flex-col items-center justify-center gap-y-6 text-center sm:mt-32"
      style={{ animationDuration: "1500ms" }}
    >
      <p className="text-lg font-medium tracking-tighter text-gray-800 dark:text-gray-200">
        Powered by industry-leading platforms and AI models
      </p>
      <div className="grid grid-cols-2 gap-10 gap-y-4 text-gray-600 md:grid-cols-4 md:gap-x-20 dark:text-gray-400">
        {companies.map((company, index) => (
          <div key={index} className="flex items-center justify-center">
            <span className="text-sm font-semibold tracking-wider uppercase">
              {company}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}