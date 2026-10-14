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
      badge: "w-7 h-7",
      title: "text-xs font-black",
      gap: "gap-2",
    },
    md: {
      badge: "w-8 h-8 sm:w-9 sm:h-9",
      title: "text-xs sm:text-sm font-black",
      gap: "gap-2.5",
    },
    lg: {
      badge: "w-10 h-10 sm:w-11 sm:h-11",
      title: "text-sm sm:text-base font-black",
      gap: "gap-3",
    },
    xl: {
      badge: "w-12 h-12 sm:w-13 sm:h-13",
      title: "text-base sm:text-lg font-black",
      gap: "gap-3.5",
    },
  }[size];

  const content = (
    <div className={`flex items-center ${sizeConfig.gap} ${className}`}>
      {/* Official Transparent 'P' Logo Emblem */}
      <div
        className={`${sizeConfig.badge} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}
      >
        <img
          src="/logos/psi-logo.png"
          alt="PSI One Logo"
          className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(239,68,68,0.22)]"
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
            PSI One Loan Management System
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
