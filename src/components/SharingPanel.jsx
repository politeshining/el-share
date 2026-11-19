import { Link } from "react-router-dom"

const SharingPanel = () => {
    return (
        <section className="mt-16 rounded-2xl border border-white/10 bg-[#171717] p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold">Start sharing</h3>
                    <p className="mt-2 text-sm text-[#88827D]">
                        Connect another device to begin transferring files.
                    </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7F2929]/15 text-[#7F2929]">
                    <span className="text-2xl">⇄</span>
                </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <Link to="/send" className="rounded-xl bg-[#7F2929] px-6 py-5 text-left transition-colors hover:bg-[#963737]">
                    <p className="text-lg font-semibold text-white">Send files</p>
                    <p className="mt-2 text-sm text-white/70">
                        Share files from this device.
                    </p>
                </Link>

                <Link to="/receive" className="rounded-xl border border-white/10 bg-[#202020] px-6 py-5 text-left transition-colors hover:bg-[#292929]">
                    <p className="text-lg font-semibold">Receive files</p>
                    <p className="mt-2 text-sm text-[#88827D]">
                        Receive files from another device.
                    </p>
                </Link>
            </div>

            <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#88827D] transition" />

                <p className="text-sm text-[#88827D]">
                    No device connected
                </p>
            </div>
        </section>
    )
}

export default SharingPanel