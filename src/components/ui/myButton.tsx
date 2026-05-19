import { Icon } from "@iconify/react";
import React from "react";

type ButtonProps = {
    onClick?: () => void;
    title?: string;
    icon?: string;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    variant?: "primary" | "secondary" | "danger";
    type?: "button" | "submit" | "reset";
    children?: React.ReactNode;
};

const Button: React.FC<ButtonProps> = ({
    onClick,
    title,
    icon,
    disabled = false,
    loading = false,
    className = "",
    variant = "primary",
    type = "button",
    children,
}) => {
    const base =
        "h-11 px-4 flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all w-full lg:w-auto";

    const variants = {
        primary: "bg-primary-600 text-white hover:bg-primary-700",
        secondary:
            "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
        danger: "bg-red-600 text-white hover:bg-red-700",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            title={title}
            className={`${base} ${variants[variant]} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
        >
            {loading ? (
                "Loading..."
            ) : (
                <>
                    {icon && <Icon icon={icon} className="w-4 h-4" />}
                    {children}
                </>
            )}
        </button>
    );
};

export default Button;