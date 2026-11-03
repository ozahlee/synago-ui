import { redirect } from "next/navigation"

/** Donations (fundraising campaigns) now live under Projects & giving. */
export default function DonationsMoved() {
  redirect("/projects")
}
