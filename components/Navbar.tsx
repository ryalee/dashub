"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  Settings,
  BarChart2,
  Menu,
  X,
  Cat
} from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/historico", label: "Histórico", Icon: Clock },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // fecha o drawer quando mudar de rota
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // desativa scroll quando drawer estiver aberto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href ||
    (href === "/dashboard" && (pathname === "/" || pathname === ""));

  return (
    <>
      <header
        className="sticky top-0 z-40"
        style={{
          background: "rgba(10,10,16,0.88)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-3">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-sm mr-2"
            style={{ color: "var(--ink)" }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 14px var(--accent-glow)",
              }}
            >
              <Cat size={18} className="text-white" />
            </div>
            <span className="hidden xs:inline">Insights</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            {LINKS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx("nav-link", isActive(href) && "active")}
              >
                <Icon size={13} />
                {label}
              </Link>
            ))}
          </nav>

          {/* Spacer */}
          <div className="flex-1 md:hidden" />

          {/* Hamburger */}
          <button
            className="btn-icon md:hidden"
            style={{ color: open ? "var(--ink)" : "var(--ink-2)" }}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 md:hidden"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <nav
            className="fixed top-14 right-0 bottom-0 z-40 md:hidden flex flex-col pt-3 pb-6 px-3 gap-1 overflow-y-auto"
            style={{
              width: "min(280px, 85vw)",
              background: "var(--bg-2)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
              animation: "slideLeft .18s ease both",
            }}
          >
            {LINKS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "nav-link py-3 px-4 text-sm rounded-xl",
                  isActive(href) && "active",
                )}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
          <style>{`
            @keyframes slideLeft {
              from { transform: translateX(100%); opacity: 0; }
              to   { transform: translateX(0);    opacity: 1; }
            }
          `}</style>
        </>
      )}
    </>
  );
}
