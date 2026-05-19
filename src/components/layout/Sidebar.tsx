"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Briefcase,
  FileText,
  Folder,
  ClipboardList,
  Wallet,
  CreditCard,
  ArrowDownCircle,
  Image as ImageIcon,
  History,
  ChevronDown,
  BarChart2,
  TableOfContents,
  X,
  ClipboardPen,
  ChevronLeft,
} from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

type NavGroup = {
  groupLabel: string;
  groupIcon: React.ElementType;
  items?: NavItem[];
  link: string;
};

const navGroups: NavGroup[] = [

  {
    groupLabel: "Users",
    groupIcon: ClipboardList,
    link: "/dashboard/users"
  },
  {
    groupLabel: "Text",
    groupIcon: TableOfContents,
    link: "/dashboard/text"
  },
  {
    groupLabel: "Quizzes",
    groupIcon: Briefcase,
    link: "/dashboard/quiz"

  },
  {
    groupLabel: "Videos",
    groupIcon: ClipboardList,
    link: "/dashboard/video"
  },
  {
    groupLabel: "Consultants",
    groupIcon: FileText,
    link: "/dashboard/consultants"
  },
  // {
  //   groupLabel: "Finance",
  //   groupIcon: Wallet,
  //   items: [
  //     { name: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  //     { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  //     { name: "Withdrawals", href: "/dashboard/withdrawals", icon: ArrowDownCircle },
  //   ],
  // },
  // {
  //   groupLabel: "Content",
  //   groupIcon: ImageIcon,
  //   items: [
  //     { name: "Banners", href: "/dashboard/banners", icon: ImageIcon },
  //   ],
  // },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(navGroups.map((g) => [g.groupLabel, true]))
  );

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const isActive = (href: string) => pathname === href;
  const isGroupActive = (items: NavItem[] | undefined) =>
    items?.some((i) => pathname === i.href);

  return (
    <>
      {/* Sidebar panel */}
      <aside
        className={`
          w-56 bg-white flex flex-col fixed h-full border-r border-gray-100 shadow-sm z-30
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between gap-2.5 px-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              {/* <Image
                src="/assets/img/logo.png"
                alt="Samarth"
                width={20}
                height={20}
                className="object-contain"
              /> */}
            </div>
            <span className="font-bold text-xl text-gray-900 tracking-tight">
              Samarth
            </span>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dashboard link */}
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/dashboard"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${pathname === "/dashboard"
                ? "bg-primary-50 text-primary-700 font-semibold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
          >
            <LayoutDashboard
              size={17}
              className={
                pathname === "/dashboard" ? "text-primary-600" : ""
              }
            />
            <span className="text-sm">Dashboard</span>
          </Link>
        </div>

        {/* Grouped Nav */}
        <nav className="flex-1 px-3 pb-4 overflow-y-auto space-y-0.5 scrollbar-hide">
          {navGroups.map((group) => {
            const isOpen = openGroups[group.groupLabel];
            const groupHasActive = isGroupActive(group.items);
            const GroupIcon = group.groupIcon;

            return (
              <div key={group.groupLabel} className="mt-1">
                <Link href={group.link} >
                  <button
                    // onClick={() => toggleGroup(group.groupLabel)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 group ${groupHasActive && !isOpen
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <GroupIcon
                        size={15}
                        className={
                          groupHasActive && !isOpen
                            ? "text-primary-500"
                            : "text-gray-400 group-hover:text-gray-500"
                        }
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {group.groupLabel}
                      </span>
                    </div>
                    {/* <ChevronLeft
                    size={14}
                    className={`transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    } ${
                      groupHasActive && !isOpen
                        ? "text-primary-500"
                        : "text-gray-400"
                    }`}
                  /> */}
                  </button>

                </Link>

                {/* <div
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    maxHeight: isOpen
                      ? `${group.items?.length * 44}px`
                      : "0px",
                  }}
                >
                  <div className="pl-3 pt-0.5 space-y-0.5">
                    {group.items?.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 text-sm ${
                            active
                              ? "bg-primary-50 text-primary-700 font-semibold"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <div
                            className={`w-1 h-4 rounded-full flex-shrink-0 transition-all ${
                              active ? "bg-primary-500" : "bg-transparent"
                            }`}
                          />
                          <Icon
                            size={16}
                            className={
                              active ? "text-primary-600" : "text-gray-400"
                            }
                          />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div> */}
              </div>
            );
          })}


        </nav>
      </aside>
    </>
  );
}