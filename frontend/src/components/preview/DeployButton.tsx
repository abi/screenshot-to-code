import { useState } from "react";
import { LuRocket } from "react-icons/lu";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import toast from "react-hot-toast";

function trackDeployInterest(action: string, email?: string) {
  const key = "deploy_interest_events";
  const events = JSON.parse(localStorage.getItem(key) || "[]");
  events.push({
    action,
    email,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem(key, JSON.stringify(events));
  console.log("[Deploy Interest]", action, email || "");
}

function DeployButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleOpen = () => {
    trackDeployInterest("click_deploy_button");
    setIsOpen(true);
    setSubmitted(false);
    setEmail("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    trackDeployInterest("submit_email", email.trim());
    setSubmitted(true);
    toast.success("Thanks! We'll notify you when Deploy is ready.");
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="ghost"
        size="sm"
        title="Deploy your page to the web"
        className="h-8 gap-1.5 text-xs font-medium"
        data-testid="deploy-button"
      >
        <LuRocket className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Deploy</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deploy to the web</DialogTitle>
            <DialogDescription>
              We're working on one-click deployment so you can publish your page
              with a shareable URL. Want to be the first to know when it's ready?
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                You're on the list! We'll reach out when deployment is available.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="deploy-email-input"
              />
              <Button type="submit" data-testid="deploy-notify-button">
                Notify me
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DeployButton;
