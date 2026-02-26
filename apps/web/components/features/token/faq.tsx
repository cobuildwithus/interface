import { FAQ_FOOTNOTES, FAQ_ITEMS } from "./faq-data";

export function TokenFAQ() {
  return (
    <section className="bg-background">
      <div className="container mx-auto px-4 py-24">
        <h2 className="text-foreground mb-16 text-4xl font-black tracking-tighter uppercase md:text-5xl">
          FAQ
        </h2>

        <div className="divide-border border-border divide-y border-t">
          {FAQ_ITEMS.map((item) => (
            <div className="grid grid-cols-1 gap-6 py-8 md:grid-cols-2" key={item.title}>
              <h3 className="text-foreground text-xl leading-tight font-bold md:text-2xl">
                {item.title}
              </h3>
              {item.body}
            </div>
          ))}

          {/* Footnotes & Disclaimers */}
          {FAQ_FOOTNOTES}
        </div>
      </div>
    </section>
  );
}
