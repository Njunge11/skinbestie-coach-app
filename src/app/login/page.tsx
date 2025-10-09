import { LoginForm } from "@/components/login-form"
import Image from "next/image"

export default function LoginPage() {
  return (
    <div className="bg-[#F3F0DF] flex min-h-svh flex-col p-6 md:p-10">
      <div className="absolute left-6 top-6 md:left-10 md:top-10">
        <Image
          src="/logo.svg"
          alt="Logo"
          width={120}
          height={40}
          priority
          className="brightness-0"
        />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm md:max-w-4xl">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
