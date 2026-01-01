"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Trash2, Plus } from "lucide-react";
import html2canvas from "html2canvas";

interface Entry {
  id: number;
  name: string;
  amount: string;
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([
    { id: 1, name: "", amount: "" },
  ]);
  const [nextId, setNextId] = useState(2);
  const printRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInputChange = (id: number, field: keyof Entry, value: string) => {
    const newEntries = entries.map((entry) =>
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    setEntries(newEntries);
  };

  const addEntry = () => {
    setEntries([...entries, { id: nextId, name: "", amount: "" }]);
    setNextId(nextId + 1);
  };

  const removeEntry = (id: number) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const setPresetAmount = (amount: number) => {
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      handleInputChange(lastEntry.id, "amount", amount.toString());
    }
  };

  const handleDownload = async () => {
    if (!printRef.current) return;
    const element = printRef.current;

    // Temporarily remove hidden class from elements that should be in the screenshot
    const elementsToUnhide = element.querySelectorAll('.print-visible');
    elementsToUnhide.forEach(el => el.classList.remove('hidden'));

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: null, // Use the actual background color
    });

    // Restore hidden class
    elementsToUnhide.forEach(el => el.classList.add('hidden'));


    const link = document.createElement("a");
    link.download = "recoleta-cash.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const totalAmount = entries.reduce(
    (sum, entry) => sum + (parseFloat(entry.amount) || 0),
    0
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 md:p-12 bg-background">
      <div className="w-full max-w-4xl">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-4xl sm:text-5xl font-display text-primary">
            Recoleta Cash
          </h1>
          <Button onClick={handleDownload} size="lg">
            <Download className="mr-2 h-5 w-5" />
            Descargar Captura
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4" ref={printRef}>
            {/* Title for screenshot */}
            <h1 className="text-4xl font-display text-primary hidden print-visible text-center mb-4">
              Recoleta Cash
            </h1>

            <div className="space-y-4">
              {entries.map((entry, index) => (
                <Card
                  key={entry.id}
                  className="p-4 bg-card-background shadow-md rounded-lg"
                >
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4">
                      <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          type="text"
                          placeholder="Nombre"
                          value={entry.name}
                          onChange={(e) =>
                            handleInputChange(entry.id, "name", e.target.value)
                          }
                          className="text-base"
                        />
                        <Input
                          type="number"
                          placeholder="Monto del Dinero"
                          value={entry.amount}
                          onChange={(e) =>
                            handleInputChange(
                              entry.id,
                              "amount",
                              e.target.value
                            )
                          }
                          className="text-base"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEntry(entry.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={addEntry}
              className="w-full mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir Cajoncito
            </Button>
             
            {/* Total Amount for screenshot */}
            <div className="hidden print-visible mt-6">
                <Card className="p-4 bg-primary text-primary-foreground shadow-lg rounded-lg">
                    <CardContent className="p-0 flex justify-between items-center">
                        <span className="text-xl font-bold">Total:</span>
                        <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
                    </CardContent>
                </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-4 bg-card-background shadow-md rounded-lg">
              <CardContent className="p-0">
                <h2 className="text-lg font-semibold mb-4 text-center text-primary">
                  Bandejitas
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[10000, 20000, 30000, 40000].map((amount) => (
                    <Button
                      key={amount}
                      variant="accent"
                      onClick={() => setPresetAmount(amount)}
                      className="text-base"
                    >
                      {isClient ? formatCurrency(amount) : `$${amount}`}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

             <Card className="p-4 bg-primary text-primary-foreground shadow-lg rounded-lg">
                <CardContent className="p-0 flex justify-between items-center">
                    <span className="text-xl font-bold">Total:</span>
                    <span className="text-2xl font-bold">{isClient ? formatCurrency(totalAmount) : '$0'}</span>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
