"use client";

import { useState, useEffect } from "react";
import { House, HouseData } from "@/types/house";

function StatusBadge({ status }: { status: House["status"] }) {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    ok: "bg-green-100 text-green-800 border-green-300",
    ko: "bg-red-100 text-red-800 border-red-300",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

function CriteriaCheck({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`text-xs ${met ? "text-green-600" : "text-red-500"}`}>
      {met ? "✓" : "✗"} {label}
    </span>
  );
}

function HouseCard({
  house,
  criteria,
  onStatusChange,
  onNotesChange,
}: {
  house: House;
  criteria: HouseData["criteria"];
  onStatusChange: (id: string, status: House["status"]) => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const meetsCriteria = {
    price: house.price <= criteria.maxPrice,
    bedrooms: house.bedrooms >= criteria.minBedrooms,
    livingArea: (house.livingAreaM2 ?? 0) >= criteria.minLivingAreaM2,
    garage: (house.garageM2 ?? 0) >= criteria.minGarageM2,
    land: (house.landM2 ?? 0) >= criteria.minLandM2,
    distance: (house.distanceMinutes ?? 999) <= criteria.maxDistanceMinutes,
    workCost: (house.estimatedWorkCost ?? 0) <= criteria.maxWorkCost,
  };

  const allMet = Object.values(meetsCriteria).every(Boolean);

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 ${
      house.status === "ok" ? "border-green-400" : 
      house.status === "ko" ? "border-red-400" : "border-gray-200"
    }`}>
      {/* Image carousel */}
      <div className="relative h-64 bg-gray-100">
        {house.images.length > 0 ? (
          <>
            <img
              src={house.images[imageIndex]}
              alt={house.title}
              className="w-full h-full object-cover"
            />
            {house.images.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {house.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    className={`w-2 h-2 rounded-full ${
                      i === imageIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
            <button
              onClick={() => setImageIndex((i) => (i > 0 ? i - 1 : house.images.length - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
            >
              ←
            </button>
            <button
              onClick={() => setImageIndex((i) => (i < house.images.length - 1 ? i + 1 : 0))}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
            >
              →
            </button>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Pas d'image
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge status={house.status} />
        </div>
        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-bold">
          {house.price.toLocaleString("fr-FR")} €
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1 line-clamp-2">{house.title}</h3>
        <p className="text-gray-600 text-sm mb-2">{house.location}</p>
        
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div>🛏️ {house.bedrooms} chambres</div>
          <div>🏠 {house.livingAreaM2 ?? "?"} m² séjour</div>
          <div>🚗 {house.garageM2 ?? "?"} m² garage</div>
          <div>🌳 {house.landM2 ?? "?"} m² terrain</div>
          {house.distanceMinutes && <div>⏱️ {house.distanceMinutes} min</div>}
          {house.hasPool && <div>🏊 Piscine</div>}
        </div>

        {/* Criteria checks */}
        <div className={`p-2 rounded-lg mb-3 ${allMet ? "bg-green-50" : "bg-red-50"}`}>
          <div className="grid grid-cols-2 gap-1">
            <CriteriaCheck met={meetsCriteria.price} label={`≤${(criteria.maxPrice/1000)}k€`} />
            <CriteriaCheck met={meetsCriteria.bedrooms} label={`≥${criteria.minBedrooms} ch.`} />
            <CriteriaCheck met={meetsCriteria.livingArea} label={`≥${criteria.minLivingAreaM2}m² séj.`} />
            <CriteriaCheck met={meetsCriteria.garage} label={`≥${criteria.minGarageM2}m² gar.`} />
            <CriteriaCheck met={meetsCriteria.land} label={`≥${criteria.minLandM2}m² ter.`} />
            <CriteriaCheck met={meetsCriteria.distance} label={`≤${criteria.maxDistanceMinutes}min`} />
          </div>
        </div>

        {/* Bonuses */}
        <div className="flex flex-wrap gap-1 mb-3">
          {house.hasPool && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">🏊 Piscine</span>}
          {house.hasView && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">👀 Vue</span>}
          {house.isTreed && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">🌳 Arboré</span>}
          {house.southFacing && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">☀️ Sud</span>}
          {house.noVisAVis && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">🔒 Sans vis-à-vis</span>}
        </div>

        {/* Notes */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-sm text-blue-600 hover:underline mb-2"
        >
          {showNotes ? "Masquer notes" : "Ajouter notes"}
        </button>
        {showNotes && (
          <textarea
            value={house.notes ?? ""}
            onChange={(e) => onNotesChange(house.id, e.target.value)}
            placeholder="Notes personnelles..."
            className="w-full p-2 border rounded text-sm mb-2"
            rows={2}
          />
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={house.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            Voir l'annonce ↗
          </a>
          <button
            onClick={() => onStatusChange(house.id, "ok")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              house.status === "ok"
                ? "bg-green-500 text-white"
                : "bg-green-100 hover:bg-green-200 text-green-700"
            }`}
          >
            ✓ OK
          </button>
          <button
            onClick={() => onStatusChange(house.id, "ko")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              house.status === "ko"
                ? "bg-red-500 text-white"
                : "bg-red-100 hover:bg-red-200 text-red-700"
            }`}
          >
            ✗ KO
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<HouseData | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "ok" | "ko">("all");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/houses")
      .then((res) => res.json())
      .then(setData);
  }, []);

  const handleStatusChange = (id: string, status: House["status"]) => {
    if (!data) return;
    setData({
      ...data,
      houses: data.houses.map((h) =>
        h.id === id ? { ...h, status } : h
      ),
    });
  };

  const handleNotesChange = (id: string, notes: string) => {
    if (!data) return;
    setData({
      ...data,
      houses: data.houses.map((h) =>
        h.id === id ? { ...h, notes } : h
      ),
    });
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/houses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setMessage("✓ Sauvegardé !");
      } else {
        setMessage("✗ Erreur lors de la sauvegarde");
      }
    } catch {
      setMessage("✗ Erreur réseau");
    }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const filteredHouses = data.houses.filter(
    (h) => filter === "all" || h.status === filter
  );

  const stats = {
    total: data.houses.length,
    pending: data.houses.filter((h) => h.status === "pending").length,
    ok: data.houses.filter((h) => h.status === "ok").length,
    ko: data.houses.filter((h) => h.status === "ko").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏠 House Finder</h1>
              <p className="text-sm text-gray-500">
                {data.targetAddress} • ≤{data.criteria.maxDistanceMinutes}min
              </p>
            </div>
            
            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-full ${filter === "all" ? "bg-gray-200" : ""}`}
              >
                Tout ({stats.total})
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`px-3 py-1 rounded-full ${filter === "pending" ? "bg-yellow-200" : ""}`}
              >
                ⏳ À voir ({stats.pending})
              </button>
              <button
                onClick={() => setFilter("ok")}
                className={`px-3 py-1 rounded-full ${filter === "ok" ? "bg-green-200" : ""}`}
              >
                ✓ OK ({stats.ok})
              </button>
              <button
                onClick={() => setFilter("ko")}
                className={`px-3 py-1 rounded-full ${filter === "ko" ? "bg-red-200" : ""}`}
              >
                ✗ KO ({stats.ko})
              </button>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-2">
              {message && (
                <span className={`text-sm ${message.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
                  {message}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? "Sauvegarde..." : "💾 Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Criteria summary */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-blue-50 rounded-lg p-4 text-sm">
          <strong>Critères :</strong> ≤{(data.criteria.maxPrice/1000)}k€ • ≥{data.criteria.minBedrooms} chambres • 
          ≥{data.criteria.minLivingAreaM2}m² séjour • ≥{data.criteria.minGarageM2}m² garage • 
          ≥{data.criteria.minLandM2}m² terrain • ≤{data.criteria.maxWorkCost}€ travaux
        </div>
      </div>

      {/* Houses grid */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {filteredHouses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {data.houses.length === 0 
              ? "Aucune maison dans le fichier. Ajoutez des maisons au fichier data/houses.json"
              : "Aucune maison pour ce filtre"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHouses.map((house) => (
              <HouseCard
                key={house.id}
                house={house}
                criteria={data.criteria}
                onStatusChange={handleStatusChange}
                onNotesChange={handleNotesChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
