import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Church, Tablet, Printer, Wifi, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Seo } from "@/components/Seo";

const hardware = [
  {
    icon: Tablet,
    title: "A tablet or laptop",
    body: "Any iPad, Android tablet, Chromebook or laptop with a modern browser works. A 10-inch or larger screen is comfortable for people of every age. Mount it on a floor stand or a counter stand near the main entrance.",
  },
  {
    icon: Wifi,
    title: "A stable internet connection",
    body: "Check-ins are saved to your church account in real time, so Wi-Fi coverage at the entrance matters more than device speed. A simple Wi-Fi extender near the door solves most problems.",
  },
  {
    icon: Printer,
    title: "Optional: a badge or label printer",
    body: "For children's ministry, a thermal label printer prints a name tag and a matching parent pickup tag. Church Management Pro also generates print-ready member cards in standard CR80 badge format if you prefer reusable cards.",
  },
  {
    icon: ShieldCheck,
    title: "Optional: a member photo on file",
    body: "Photos make the volunteer's verification instant. The Photo Booth tool lets a volunteer capture a photo with the same tablet, or send members a private link to upload their own.",
  },
];

const steps = [
  {
    title: "1. Create the kiosk check-in link",
    body: "In your church account, open Attendance and generate a self check-in link. Each link is unique to your church and can be printed as a QR code for people who prefer to check in from their own phone.",
  },
  {
    title: "2. Open the link on the kiosk device",
    body: "Load the link in the browser, then add it to the home screen so it opens full screen. On iPad use Guided Access and on Android use screen pinning so visitors cannot leave the check-in page.",
  },
  {
    title: "3. Choose how people identify themselves",
    body: "Members can check in with their member number or their phone number. Phone numbers are matched in international format, so a number saved with or without a country code still finds the right person.",
  },
  {
    title: "4. Turn on location confirmation (optional)",
    body: "If you want to be sure people are physically at the building, enable the location prompt. The device asks for permission once and then confirms the person is on site before recording the check-in.",
  },
  {
    title: "5. Print name tags for children",
    body: "For family check-in, print a child tag and a matching pickup tag. Volunteers release a child only to the adult holding the matching tag, which gives you a simple, auditable safety process.",
  },
  {
    title: "6. Review attendance the same day",
    body: "Every check-in is timestamped, so your reports show who attended, how many arrived early, on time or late, and which members have not been seen for several weeks.",
  },
];

const benefits = [
  "No sign-in sheets to type up on Monday morning.",
  "Accurate weekly and yearly attendance figures for your board and your annual report.",
  "Automatic alerts when a regular attender stops coming, so pastoral care happens sooner.",
  "Faster entry on busy Sundays: most people check in within a few seconds.",
  "A safer children's ministry through matching child and pickup tags.",
];

export default function ChurchCheckInKiosk() {
  const url = "https://churchmanagementpro.com/guides/church-check-in-kiosk";

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="How to Set Up a Church Check-In Kiosk (Step-by-Step)"
        description="A practical guide to building a church check-in system: the tablet and printer you need, how to set up self check-in, child name tags and accurate attendance reports."
        path="/guides/church-check-in-kiosk"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "How to Set Up a Church Check-In Kiosk",
            description:
              "A step-by-step guide to setting up a church check-in system with a tablet kiosk, optional label printer and automated attendance tracking.",
            mainEntityOfPage: url,
            author: { "@type": "Organization", name: "Church Management Pro" },
            publisher: { "@type": "Organization", name: "Church Management Pro" },
          })}
        </script>
      </Helmet>

      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link to="/commercial" className="flex items-center gap-2 font-semibold">
            <Church className="h-5 w-5 text-primary" />
            <span>Church Management Pro</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/commercial">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <article>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Guide</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            How to set up a church check-in kiosk
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            A check-in kiosk replaces the clipboard at the door. Members tap their name, children get a
            printed tag, and your attendance report is finished before the service ends. Here is what you
            need and how to set it up.
          </p>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">What you need</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {hardware.map((item) => (
                <Card key={item.title}>
                  <CardContent className="pt-6">
                    <item.icon className="h-6 w-6 text-primary" />
                    <h3 className="mt-3 font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Setting up the kiosk step by step</h2>
            <ol className="mt-6 space-y-6">
              {steps.map((step) => (
                <li key={step.title}>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Why automated attendance tracking is worth it</h2>
            <ul className="mt-6 space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-muted-foreground">
                  <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">A few practical tips</h2>
            <ul className="mt-6 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Place the kiosk where people already slow down, not in the middle of the doorway.</li>
              <li>Keep a printed QR code beside it so several people can check in from their own phones at once.</li>
              <li>Ask one volunteer to stand next to the kiosk for the first few Sundays.</li>
              <li>Plug the tablet into power. A kiosk that dies at 10:30 is worse than a clipboard.</li>
              <li>Add member photos ahead of time so volunteers can confirm identities at a glance.</li>
            </ul>
          </section>

          <section className="mt-12 rounded-lg border bg-muted/40 p-8 text-center">
            <h2 className="text-2xl font-semibold">Try it with your own church</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Church Management Pro includes self check-in, member cards, photo capture and attendance
              reporting. The trial runs for 14 days and no card is required.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/commercial">Start a free trial</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}
