"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Wrench, Eye, EyeOff } from "lucide-react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Isi username dan password");
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Username atau password anda salah, silahkan coba lagi");
        setLoading(false);
        return;
      }

      toast.success("Login berhasil");

      // Broadcast login event using localStorage (triggers 'storage' event in other tabs)
      localStorage.setItem("auth_event", "login");
      // Reset after a moment so it can be triggered again? 
      // Actually, we just need to change the value or ensure it triggers. 
      // Simply setting it is enough if the value changes or we toggle it.
      // Better: Include timestamp to ensure Uniqueness
      localStorage.setItem("auth_event", `login_${Date.now()}`);

      // redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan saat login");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-200 w-full relative flex items-start sm:items-center justify-center pt-[10vh] sm:pt-0 pb-10 overflow-hidden font-sans">
      {/* background biru di atas */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-slate-900 flex flex-col items-center justify-center text-white" />
      {/* Card */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-6 px-4 sm:px-0">
        <Card className="w-full bg-white border-slate-200 shadow-xl sm:shadow-2xl rounded-2xl sm:rounded-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-0">
              <Image
                src="/logo.png"
                alt="RWA Garage Logo"
                width={180}
                height={180}
                className="w-auto h-16 sm:h-20 object-contain"
                priority
              />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 text-violet-950">RWA GARAGE</CardTitle>
            <CardDescription className="text-slate-500">
              Workshop Management System
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-4">
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-900 font-medium ">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  disabled={loading}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-11 sm:h-12 focus-visible:ring-sky-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-900 font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    disabled={loading}
                    className="h-11 sm:h-12 pr-12 focus-visible:ring-sky-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-11 sm:h-12 w-12 flex items-center justify-center text-slate-500 hover:text-slate-700 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {error && (
                  <p className="text-red-500 text-sm">
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-sky-700 hover:bg-sky-600 text-white text-base font-medium shadow-lg h-11 sm:h-12 focus-visible:ring-sky-700 rounded-lg"
                disabled={loading}
              >
                {loading ? "Memproses..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
