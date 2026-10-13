export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[320px] w-[min(720px,130vw)] sm:h-[420px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgb(91 124 250 / 0.16), transparent)",
        }}
      />
      <div className="relative flex w-full justify-center">{children}</div>
    </main>
  );
}
