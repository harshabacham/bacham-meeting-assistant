import { ShieldCheck } from 'lucide-react';

export function TermsPage() {
    return (
        <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-12">
                <div className="flex items-center gap-3 mb-8">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">
                        Terms & Policies
                    </h1>
                </div>

                <div className="space-y-8 text-muted-foreground leading-relaxed">
                    <section className="bg-surface/50 border border-border/40 rounded-xl p-8 shadow-sm backdrop-blur-sm">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Privacy & Data Storage</h2>
                        <p className="mb-4">
                            BACHAM is a local-first application designed with your privacy in mind. 
                            Your screen recordings, audio transcriptions, and generated notes are stored entirely locally on your device.
                        </p>
                        <p>
                            We do not upload, process, or sell your personal meeting data to third-party servers, except when you explicitly choose to use a cloud-based AI provider (like Google Gemini) for semantic search or note generation.
                        </p>
                    </section>

                    <section className="bg-surface/50 border border-border/40 rounded-xl p-8 shadow-sm backdrop-blur-sm">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Cloud AI Usage</h2>
                        <p className="mb-4">
                            When using cloud AI providers (e.g., Gemini), chunks of your transcript text may be sent to their APIs to generate embeddings or summaries. 
                            Please review the respective privacy policies of these providers.
                        </p>
                        <p>
                            You have the option to configure local AI providers (like Ollama) in the Settings to maintain 100% offline and private data processing.
                        </p>
                    </section>

                    <section className="bg-surface/50 border border-border/40 rounded-xl p-8 shadow-sm backdrop-blur-sm">
                        <h2 className="text-xl font-semibold text-foreground mb-4">Software License</h2>
                        <p>
                            This software is provided "as is", without warranty of any kind, express or implied. 
                            In no event shall the authors or copyright holders be liable for any claim, damages, or other liability arising from, out of, or in connection with the software or the use or other dealings in the software.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
