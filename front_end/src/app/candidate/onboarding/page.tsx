/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Candidate Onboarding Wizard (5 steps)
 * ─────────────────────────────────────────────────────────────
 *  A multi-step form that collects the candidate's career
 *  context before generating their personalised roadmap.
 *
 *  Steps:
 *    1. Career Goal  — free-text aspiration
 *    2. Target Role  — role title + optional company
 *    3. Skill Level  — beginner / intermediate / advanced
 *    4. Experience   — years of professional work
 *    5. Resume       — optional file upload (demo only)
 *
 *  On final submission the data is POSTed to the backend
 *  (`postOnboarding`) and the user is redirected to the
 *  AI-generated roadmap page.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { postOnboarding } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { RouteGuard } from "@/components/route-guard";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Zap, ArrowLeft, ArrowRight, Upload, Briefcase,
  Target, BarChart3, Clock, FileText, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


/* ════════════════════════════════════════════════════════════
 *  STEP DEFINITIONS & OPTION LISTS
 * ════════════════════════════════════════════════════════════ */

/** Wizard step metadata (icon shown in progress indicator). */
const steps = [
  { id: 1, label: "Career Goal", icon: Target     },
  { id: 2, label: "Target Role", icon: Briefcase  },
  { id: 3, label: "Skill Level", icon: BarChart3  },
  { id: 4, label: "Experience",  icon: Clock      },
  { id: 5, label: "Resume",      icon: FileText   },
];

/** Self-assessed competence tiers. */
const skillLevels = [
  { value: "beginner",     label: "Beginner",     description: "Just starting out or switching careers"       },
  { value: "intermediate", label: "Intermediate", description: "Some experience, looking to level up"         },
  { value: "advanced",     label: "Advanced",     description: "Experienced, targeting senior+ roles"         },
];

/** Professional experience brackets. */
const experienceLevels = [
  { value: "0",   label: "No experience", description: "Student or bootcamp graduate" },
  { value: "1-2", label: "1-2 years",     description: "Early career professional"   },
  { value: "3-5", label: "3-5 years",     description: "Mid-level professional"      },
  { value: "5+",  label: "5+ years",      description: "Senior professional"         },
];


/* ════════════════════════════════════════════════════════════
 *  ONBOARDING PAGE COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function OnboardingPage() {
  const router   = useRouter();
  const { user } = useAuth();

  /* ── Wizard state ── */
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    careerGoal:      "",
    targetRole:      "",
    targetCompany:   "",
    skillLevel:      "",
    experienceLevel: "",
    resumeUploaded:  false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = steps.length;
  const progress   = (currentStep / totalSteps) * 100;


  /* ────────────────────────────────────────────────────────
   *  Validation — determines whether "Continue" is enabled
   * ──────────────────────────────────────────────────────── */
  const canProceed = () => {
    switch (currentStep) {
      case 1:  return formData.careerGoal.trim().length > 0;
      case 2:  return formData.targetRole.trim().length > 0;
      case 3:  return formData.skillLevel !== "";
      case 4:  return formData.experienceLevel !== "";
      case 5:  return true;  // resume is optional
      default: return false;
    }
  };


  /* ────────────────────────────────────────────────────────
   *  Navigation handlers
   * ──────────────────────────────────────────────────────── */
  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step — submit to backend, then redirect
      setIsSubmitting(true);
      try {
        await postOnboarding(formData);
      } catch {
        // Backend might be down — continue anyway
      }
      // Persist locally so the roadmap page has context
      localStorage.setItem("onboardingData", JSON.stringify(formData));
      setIsSubmitting(false);
      router.push("/candidate/roadmap");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  /* ════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════ */

  return (
    <RouteGuard allowedRoles={["candidate"]}>
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Top bar ── */}
      <div className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              GUIDED
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Progress bar + step indicators ── */}
      <div className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium">
              {steps[currentStep - 1].label}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Step indicators */}
          <div className="mt-4 flex justify-between">
            {steps.map((step) => {
              const Icon = step.icon;
              const isCompleted = step.id < currentStep;
              const isCurrent = step.id === currentStep;
              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                          ? "bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`hidden text-xs sm:block ${
                      isCurrent
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Form content (step-dependent) ── */}
      <div className="flex flex-1 items-start justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          {/* Step 1: Career Goal */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  What&apos;s your career goal?
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Tell us what you&apos;re working toward. This helps us
                  personalize your roadmap.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="careerGoal">Describe your goal</Label>
                <Textarea
                  id="careerGoal"
                  placeholder="e.g., Break into FAANG as a frontend engineer, transition from marketing to product management..."
                  className="min-h-[120px] resize-none"
                  value={formData.careerGoal}
                  onChange={(e) =>
                    setFormData({ ...formData, careerGoal: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Be as specific as possible for better recommendations.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Target Role */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  What role are you targeting?
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Help us understand the specific position you&apos;re aiming for.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="targetRole">Target Role</Label>
                  <Input
                    id="targetRole"
                    placeholder="e.g., Senior Frontend Engineer"
                    value={formData.targetRole}
                    onChange={(e) =>
                      setFormData({ ...formData, targetRole: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetCompany">
                    Target Company{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="targetCompany"
                    placeholder="e.g., Google, any FAANG, Series B startup..."
                    value={formData.targetCompany}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targetCompany: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Skill Level */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  What&apos;s your current skill level?
                </h2>
                <p className="mt-2 text-muted-foreground">
                  This helps us calibrate the difficulty of your roadmap.
                </p>
              </div>
              <RadioGroup
                value={formData.skillLevel}
                onValueChange={(value) =>
                  setFormData({ ...formData, skillLevel: value })
                }
                className="space-y-3"
              >
                {skillLevels.map((level) => (
                  <label
                    key={level.value}
                    htmlFor={level.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary/30 ${
                      formData.skillLevel === level.value
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <RadioGroupItem
                      value={level.value}
                      id={level.value}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {level.description}
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 4: Experience */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  How much experience do you have?
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Years of professional experience in your field.
                </p>
              </div>
              <RadioGroup
                value={formData.experienceLevel}
                onValueChange={(value) =>
                  setFormData({ ...formData, experienceLevel: value })
                }
                className="space-y-3"
              >
                {experienceLevels.map((level) => (
                  <label
                    key={level.value}
                    htmlFor={`exp-${level.value}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary/30 ${
                      formData.experienceLevel === level.value
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <RadioGroupItem
                      value={level.value}
                      id={`exp-${level.value}`}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {level.description}
                      </div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 5: Resume Upload */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Upload your resume
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Optional, but helps us provide more targeted recommendations.
                </p>
              </div>
              <div
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
                  formData.resumeUploaded
                    ? "border-primary/30 bg-primary/5"
                    : "hover:border-primary/20"
                }`}
              >
                {formData.resumeUploaded ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-6 w-6 text-primary" />
                    </div>
                    <p className="mt-4 font-medium">resume_2026.pdf</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      File uploaded successfully
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() =>
                        setFormData({ ...formData, resumeUploaded: false })
                      }
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="mt-4 font-medium">
                      Drag and drop your resume here
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      PDF, DOC, or DOCX up to 10MB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() =>
                        setFormData({ ...formData, resumeUploaded: true })
                      }
                    >
                      Browse Files
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-10 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? "Generating..." : currentStep === totalSteps ? "Generate Roadmap" : "Continue"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
    </RouteGuard>
  );
}
