import NavBar from "../components/NavBar"
import SharingPanel from "../components/SharingPanel"

const Home = () => {
    return (
        <div className="mx-auto max-w-4xl">
            <NavBar />

            <section className="mt-28 max-w-2xl">
                <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-[#7F2929]">
                    Seamless file sharing
                </p>

                <h2 className="text-5xl font-semibold leading-tight tracking-tight">
                    Your files.
                    <br />
                    Your devices.
                    <br />
                    <span className="text-[#88827D]">Connected.</span>
                </h2>

                <p className="mt-6 max-w-lg text-base leading-7 text-[#88827D]">
                    Send files between your phone and computer without cables,
                    complicated setups, or unnecessary accounts.
                </p>
            </section>

            <SharingPanel />
        </div>
    )
}

export default Home