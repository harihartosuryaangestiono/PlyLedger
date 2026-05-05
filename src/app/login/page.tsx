import { LoginForm } from "./login-form";
import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login - PlyLedger",
  description: "Sign in to PlyLedger Trading Management System",
};

export default async function LoginPage() {
  const session = await auth();
  
  if (session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[100px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[100px]" />
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex justify-center">
        <LoginForm />
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md text-center">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} PlyLedger. All rights reserved.
        </p>
      </div>
    </div>
  );
}
