
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const toastStyles = {
    success: {
        icon: CheckCircle2,
        iconColor: 'text-green-400',
        iconBg: 'bg-green-500/10',
    },
    error: {
        icon: AlertCircle,
        iconColor: 'text-red-400',
        iconBg: 'bg-red-500/10',
    },
    warning: {
        icon: AlertTriangle,
        iconColor: 'text-yellow-400',
        iconBg: 'bg-yellow-500/10',
    },
    info: {
        icon: Info,
        iconColor: 'text-blue-400',
        iconBg: 'bg-blue-500/10',
    },
};

const Toast = ({ toast, onClose }) => {
    const style = toastStyles[toast.type] || toastStyles.info;
    const Icon = style.icon;

    return (
        <div
            className={`flex mx-auto w-full max-w-sm items-center gap-3 rounded-xl border border-white/10 bg-[#202020] p-4 shadow-xl ${toast.exiting
                ? '-translate-y-6 opacity-0 transition-all duration-300 ease-out'
                : 'animate-toast-enter'
                }`}
        >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}>
                <Icon size={20} className={style.iconColor} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#EAE5DF]">
                    {toast.title}
                </p>

                {toast.message && (
                    <p className="mt-1 text-xs text-[#A39B95]">
                        {toast.message}
                    </p>
                )}
            </div>

            <button
                onClick={onClose}
                className="shrink-0 text-[#88827D] transition hover:text-white"
                aria-label="Close notification"
            >
                <X size={18} />
            </button>
        </div>
    );
};

export default Toast;
