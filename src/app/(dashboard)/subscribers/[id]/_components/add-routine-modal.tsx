"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LayoutTemplate, FilePlus, Search, ArrowLeft } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
}

interface AddRoutineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  onCreateFromTemplate: (
    templateId: string,
    routineName: string,
    startDate: Date,
    endDate: Date | null,
  ) => Promise<void>;
  onCreateBlank: (
    routineName: string,
    startDate: Date,
    endDate: Date | null,
  ) => Promise<void>;
}

type View = "start" | "template" | "info";

export function AddRoutineModal({
  open,
  onOpenChange,
  templates,
  onCreateFromTemplate,
  onCreateBlank,
}: AddRoutineModalProps) {
  const [view, setView] = useState<View>("start");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [routineName, setRoutineName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useTemplate, setUseTemplate] = useState(false);

  // Set default template when templates are loaded
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOptionClick = (option: "template" | "blank") => {
    if (option === "template") {
      setUseTemplate(true);
      setView("template");
    } else {
      setUseTemplate(false);
      setView("info");
    }
  };

  const handleGoBackFromTemplate = () => {
    setView("start");
    setSearchQuery("");
  };

  const handleGoBackFromInfo = () => {
    if (useTemplate) {
      setView("template");
    } else {
      setView("start");
    }
  };

  const handleContinueFromTemplate = () => {
    // Pre-fill routine name with template name
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
    if (selectedTemplate) {
      setRoutineName(selectedTemplate.name);
    }
    setView("info");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!routineName.trim() || !startDate) {
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateObj = new Date(startDate);
      const endDateObj = endDate ? new Date(endDate) : null;

      if (useTemplate && selectedTemplateId) {
        await onCreateFromTemplate(
          selectedTemplateId,
          routineName.trim(),
          startDateObj,
          endDateObj,
        );
      } else {
        await onCreateBlank(routineName.trim(), startDateObj, endDateObj);
      }

      // Reset form
      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating routine:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setView("start");
    setSelectedTemplateId(templates.length > 0 ? templates[0].id : "");
    setSearchQuery("");
    setRoutineName("");
    setStartDate("");
    setEndDate("");
    setUseTemplate(false);
  };

  const handleCancel = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0">
        {view === "start" && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-xl font-semibold">
                New routine
              </DialogTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Choose a starting point.
              </p>
            </DialogHeader>

            <div className="p-6 space-y-3">
              <button
                onClick={() => handleOptionClick("template")}
                className="w-full p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all duration-200 text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <LayoutTemplate className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold mb-0.5">
                      From template
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Use a template as starting point. Customise it as needed.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleOptionClick("blank")}
                className="w-full p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-all duration-200 text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FilePlus className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold mb-0.5">
                      Blank routine
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Start from scratch.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {view === "template" && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-xl font-semibold">
                Select a template
              </DialogTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Select an existing template to use as a starting point. You can
                customise it as needed.
              </p>
            </DialogHeader>

            <div className="px-6 py-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search routine templates"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    ROUTINE TEMPLATES
                  </h3>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                    {filteredTemplates.length}
                  </span>
                </div>

                <RadioGroup
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <div className="divide-y max-h-[320px] overflow-y-auto">
                      {filteredTemplates.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No templates found
                        </div>
                      ) : (
                        filteredTemplates.map((template) => (
                          <Label
                            key={template.id}
                            htmlFor={template.id}
                            className="flex items-start gap-3 p-4 hover:bg-accent transition-colors cursor-pointer"
                          >
                            <RadioGroupItem
                              value={template.id}
                              id={template.id}
                              className="mt-0.5 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm leading-tight mb-0.5">
                                {template.name}
                              </div>
                              {template.description && (
                                <div className="text-sm text-muted-foreground">
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </Label>
                        ))
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="border-t px-6 py-3 flex items-center justify-between bg-background">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBackFromTemplate}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go back
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleContinueFromTemplate}
                  disabled={!selectedTemplateId}
                >
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {view === "info" && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-xl font-semibold">
                {useTemplate ? "Customise routine" : "Create routine"}
              </DialogTitle>
              <p className="text-muted-foreground text-sm mt-1">
                {useTemplate
                  ? "Customise the routine details."
                  : "Enter the routine details."}
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="routine-name" className="text-sm">
                    Routine Name *
                  </Label>
                  <Input
                    id="routine-name"
                    value={routineName}
                    onChange={(e) => setRoutineName(e.target.value)}
                    placeholder="e.g., Winter Acne Treatment Routine"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="routine-startDate" className="text-sm">
                    Start Date *
                  </Label>
                  <Input
                    id="routine-startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="routine-endDate" className="text-sm">
                    End Date (Optional)
                  </Label>
                  <Input
                    id="routine-endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for an ongoing routine
                  </p>
                </div>
              </div>

              <div className="border-t px-6 py-3 flex items-center justify-between bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGoBackFromInfo}
                  className="gap-2"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go back
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || !routineName.trim() || !startDate}
                  >
                    {isSubmitting ? "Creating..." : "Create Routine"}
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
