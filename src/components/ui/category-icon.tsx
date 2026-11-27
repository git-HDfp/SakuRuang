"use client";

import {
  AirplaneTilt,
  ArrowsLeftRight,
  Bank,
  Basket,
  Books,
  Briefcase,
  CarProfile,
  Coffee,
  CreditCard,
  DeviceMobile,
  FilmSlate,
  FirstAidKit,
  ForkKnife,
  GameController,
  Gift,
  GraduationCap,
  Heartbeat,
  House,
  Lightning,
  PiggyBank,
  Receipt,
  ShoppingBag,
  Tag,
  TrendUp,
  UsersThree,
  Vault,
  Wallet,
} from "@phosphor-icons/react";

export const AVAILABLE_ICONS = [
  "Wallet",
  "Bank",
  "DeviceMobile",
  "Vault",
  "PiggyBank",
  "CreditCard",
  "ForkKnife",
  "Basket",
  "CarProfile",
  "Lightning",
  "FirstAidKit",
  "Books",
  "Coffee",
  "FilmSlate",
  "UsersThree",
  "Briefcase",
  "TrendUp",
  "AirplaneTilt",
  "House",
  "ShoppingBag",
  "Gift",
  "Receipt",
  "Heartbeat",
  "GraduationCap",
  "GameController",
  "ArrowsLeftRight",
  "Tag",
] as const;

export function CategoryIcon({
  name,
  size = 18,
  weight = "duotone",
  className,
}: {
  name?: string | null;
  size?: number;
  weight?: "regular" | "duotone" | "bold" | "fill";
  className?: string;
}) {
  switch (name) {
    case "Wallet":
      return <Wallet size={size} weight={weight} className={className} />;
    case "Bank":
      return <Bank size={size} weight={weight} className={className} />;
    case "DeviceMobile":
      return <DeviceMobile size={size} weight={weight} className={className} />;
    case "Vault":
      return <Vault size={size} weight={weight} className={className} />;
    case "PiggyBank":
      return <PiggyBank size={size} weight={weight} className={className} />;
    case "CreditCard":
      return <CreditCard size={size} weight={weight} className={className} />;
    case "ForkKnife":
      return <ForkKnife size={size} weight={weight} className={className} />;
    case "Basket":
      return <Basket size={size} weight={weight} className={className} />;
    case "CarProfile":
      return <CarProfile size={size} weight={weight} className={className} />;
    case "Lightning":
      return <Lightning size={size} weight={weight} className={className} />;
    case "FirstAidKit":
      return <FirstAidKit size={size} weight={weight} className={className} />;
    case "Books":
      return <Books size={size} weight={weight} className={className} />;
    case "Coffee":
      return <Coffee size={size} weight={weight} className={className} />;
    case "FilmSlate":
      return <FilmSlate size={size} weight={weight} className={className} />;
    case "UsersThree":
      return <UsersThree size={size} weight={weight} className={className} />;
    case "Briefcase":
      return <Briefcase size={size} weight={weight} className={className} />;
    case "TrendUp":
      return <TrendUp size={size} weight={weight} className={className} />;
    case "AirplaneTilt":
      return <AirplaneTilt size={size} weight={weight} className={className} />;
    case "House":
      return <House size={size} weight={weight} className={className} />;
    case "ShoppingBag":
      return <ShoppingBag size={size} weight={weight} className={className} />;
    case "Gift":
      return <Gift size={size} weight={weight} className={className} />;
    case "Receipt":
      return <Receipt size={size} weight={weight} className={className} />;
    case "Heartbeat":
      return <Heartbeat size={size} weight={weight} className={className} />;
    case "GraduationCap":
      return <GraduationCap size={size} weight={weight} className={className} />;
    case "GameController":
      return <GameController size={size} weight={weight} className={className} />;
    case "ArrowsLeftRight":
      return <ArrowsLeftRight size={size} weight={weight} className={className} />;
    default:
      return <Tag size={size} weight={weight} className={className} />;
  }
}
