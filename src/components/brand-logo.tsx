/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg" | "xl";
  theme?: "dark" | "light";
  className?: string;
  showText?: boolean;
}

export function BrandLogo({
  href = "/",
  size = "md",
  theme = "dark",
  className = "",
  showText = true,
}: BrandLogoProps) {
  const isLight = theme === "light";

  const sizeConfig = {
    sm: {
      badge: "w-8 h-8 rounded-lg p-0.5",
      title: "text-sm",
      sub: "text-[9px] tracking-wider",
      gap: "gap-2.5",
    },
    md: {
      badge: "w-10 h-10 rounded-xl p-1",
      title: "text-base",
      sub: "text-[10px] tracking-wider",
      gap: "gap-3",
    },
    lg: {
      badge: "w-12 h-12 rounded-2xl p-1.5",
      title: "text-lg",
      sub: "text-[11px] tracking-widest",
      gap: "gap-3.5",
    },
    xl: {
      badge: "w-14 h-14 rounded-2xl p-1.5",
      title: "text-xl",
      sub: "text-xs tracking-widest",
      gap: "gap-4",
    },
  }[size];

  const content = (
    <div className={`flex items-center ${sizeConfig.gap} ${className}`}>
      {/* Official Red 'P' Logo Emblem Asset */}
      <div
        className={`${sizeConfig.badge} bg-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/10 border border-slate-200/80 overflow-hidden group-hover:scale-105 transition-transform duration-200`}
      >
        <img
          src="/logos/psi-logo.jpg"
          alt="PSI One Logo"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Typography */}
      {showText && (
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
      )}
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
