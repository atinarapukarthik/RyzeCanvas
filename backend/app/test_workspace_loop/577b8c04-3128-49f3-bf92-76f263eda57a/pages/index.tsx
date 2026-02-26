import Header from "@/components/header";

export default function Home() {
  return (
    <>
      <Header />
      <main
        className={`
          bg-surfaceNeutrals dark:bg-backgroundDark
          text-primary
          min-h-screen
          flex flex-col items-center justify-center
          gap-8 p-4
        `}
      >
        <h1 className="text-4xl font-bold font-inter">
          Welcome to MySite
        </h1>
        <p className="max-w-prose text-center font-roboto text-lg">
          Discover the next generation of web experiences crafted with precision
          and performance in mind.
        </p>
        <a
          href="/about"
          className={`
            px-6 py-3
            bg-primary text-surfaceNeutrals
            font-roboto rounded-md
            hover:bg-accent
            transition-colors
          `}
        >
          Learn More
        </a>
      </main>
    </>
  );
}