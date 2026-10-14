import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
  className?: string;
}

export function BrandLogo({
  href = "/",
  size = "md",
  theme = "dark",
  className = "",
}: BrandLogoProps) {
  const isLight = theme === "light";

  const sizeConfig = {
    sm: {
      badge: "w-8 h-8 rounded-lg text-xs font-black",
      title: "text-sm",
      sub: "text-[9px] tracking-wider",
      gap: "gap-2.5",
    },
    md: {
      badge: "w-10 h-10 rounded-xl text-sm font-black",
      title: "text-base",
      sub: "text-[10px] tracking-wider",
      gap: "gap-3",
    },
    lg: {
      badge: "w-12 h-12 rounded-2xl text-base font-black",
      title: "text-lg",
      sub: "text-[11px] tracking-widest",
      gap: "gap-3.5",
    },
  }[size];

  const content = (
    <div className={`flex items-center ${sizeConfig.gap} ${className}`}>
      {/* Signature Blue PSI Squircle Badge with Glow */}
      <div
        className={`${sizeConfig.badge} bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/35 border border-blue-400/20 tracking-normal`}
      >
        PSI
      </div>

      {/* Typography */}
      <div className="flex flex-col text-left">
        <span
          className={`${sizeConfig.title} font-black tracking-tight leading-tight ${
            isLight ? "text-slate-900" : "text-white"
          }`}
        >
          PSI One LMS
        </span>
        <span
          className={`${sizeConfig.sub} font-semibold uppercase ${
            isLight ? "text-slate-500" : "text-slate-400"
          }`}
        >
          Loan Management System
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group inline-block transition hover:opacity-95">
        {content}
      </Link>
    );
  }

  return content;
}
