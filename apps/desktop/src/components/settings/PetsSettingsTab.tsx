import React from 'react';
import { usePetStore, PET_DEFINITIONS, PetId } from '@/shared/stores/petStore';
import { PetAvatar } from '@/components/pets/PetAvatars';
import { Sparkles, Eye, EyeOff, Check, Sliders } from 'lucide-react';

export const PetsSettingsTab: React.FC = () => {
  const { 
    selectedPetId, setSelectedPetId, 
    petSize, setPetSize, 
    isTuckedAway, toggleTuckedAway, 
    hidePet, setHidePet 
  } = usePetStore();

  const currentPet = PET_DEFINITIONS.find(p => p.id === selectedPetId) || PET_DEFINITIONS[0];

  return (
    <div className="space-y-6 w-full max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Desktop Companions</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose an interactive AI companion that monitors meeting threads and assists your focus.
          </p>
        </div>

        <button
          onClick={() => toggleTuckedAway()}
          className="px-3.5 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-raised text-xs font-semibold text-foreground transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          {isTuckedAway ? <Eye size={13} className="text-primary" /> : <EyeOff size={13} />}
          <span>{isTuckedAway ? 'Show Pet' : 'Tuck Away Pet'}</span>
        </button>
      </div>

      {/* Active Companion Showcase Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="w-28 h-28 rounded-2xl bg-surface-raised border border-border flex items-center justify-center shrink-0 shadow-inner relative group">
          <PetAvatar id={currentPet.id} size={Math.min(petSize, 80)} isHovered />
          <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-sm">
            Active
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h3 className="text-base font-bold text-foreground">{currentPet.name}</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              Selected Companion
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
            {currentPet.description}
          </p>
          <p className="text-[11px] text-muted-foreground/80 pt-1">
            Status: {hidePet ? 'Hidden globally' : isTuckedAway ? 'Tucked away at the screen corner' : 'Active and floating on desktop'}
          </p>
        </div>
      </div>

      {/* Pet Selection Grid */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Sparkles size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Available Companions</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PET_DEFINITIONS.map((pet) => {
            const isSelected = selectedPetId === pet.id;
            return (
              <div 
                key={pet.id}
                onClick={() => setSelectedPetId(pet.id as PetId)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected 
                    ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30' 
                    : 'bg-surface-raised border-border hover:border-foreground/20 hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0 shadow-inner">
                    <PetAvatar id={pet.id} size={36} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-foreground truncate">{pet.name}</h4>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                      {pet.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {isSelected ? 'Currently Selected' : 'Click to select'}
                  </span>
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                      <Check size={12} /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground hover:text-foreground">
                      Select &rarr;
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Companion Size & Behavior Controls */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Sliders size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Companion Controls</h3>
        </div>

        {/* Size Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">Companion Size</label>
            <span className="text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
              {petSize}px
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">Adjust the scale of your floating companion on screen.</p>
          <input
            type="range"
            min="48"
            max="100"
            step="4"
            value={petSize}
            onChange={(e) => setPetSize(parseInt(e.target.value))}
            className="w-full h-1.5 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>48px (Compact)</span>
            <span>68px (Default)</span>
            <span>100px (Large)</span>
          </div>
        </div>

        {/* Hide Globally Toggle */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-foreground">Hide Pet Globally</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Temporarily remove the floating companion widget entirely from the application window.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={hidePet}
              onChange={(e) => setHidePet(e.target.checked)}
            />
            <div className="w-11 h-6 bg-surface-raised border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
