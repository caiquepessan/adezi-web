import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-background">
      {/* Subtle modern background grid or light gradient instead of neon blurs */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
            <span className="text-xs font-semibold text-primary tracking-wide uppercase">Software Profissional para Adegas</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight text-foreground">
            Gestão <span className="text-primary">Completa</span> e<br className="hidden md:block"/> Descomplicada
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Tenha controle total do seu estoque, caixa e emissão de notas com um sistema rápido, seguro e que funciona até sem internet.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link to="/register" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center">
              Criar Conta Grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <a href="#features" className="w-full sm:w-auto bg-white/5 border border-white/10 hover:bg-white/10 text-foreground px-8 py-4 rounded-xl font-bold text-lg transition-colors flex items-center justify-center">
              Ver Funcionalidades
            </a>
          </div>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-sm text-muted-foreground font-medium">
            <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-primary" /> Sem taxa de adesão</div>
            <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-primary" /> Teste grátis</div>
            <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-primary" /> Suporte dedicado</div>
          </div>
        </motion.div>

        {/* Hero Dashboard Mockup (Sleek Window) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 sm:mt-24 relative max-w-5xl mx-auto"
        >
          <div className="rounded-xl border border-white/10 bg-[#0c0c0e] shadow-2xl overflow-hidden relative">
            {/* OSX-like Window Header */}
            <div className="h-12 bg-[#18181b] border-b border-white/10 flex items-center px-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-white/20"></div>
                <div className="w-3 h-3 rounded-full bg-white/20"></div>
                <div className="w-3 h-3 rounded-full bg-white/20"></div>
              </div>
              <div className="mx-auto text-xs font-medium text-muted-foreground/50">app.adezi.com.br</div>
            </div>
            
            {/* Fake App Interface */}
            <div className="p-4 md:p-8 flex gap-6 text-left h-[400px]">
              {/* Sidebar Mock */}
              <div className="hidden md:flex flex-col w-48 space-y-4">
                <div className="h-8 w-full bg-white/5 rounded-md"></div>
                <div className="h-8 w-3/4 bg-white/5 rounded-md"></div>
                <div className="h-8 w-5/6 bg-white/5 rounded-md"></div>
              </div>
              
              {/* Main Content Mock */}
              <div className="flex-1 flex flex-col gap-6">
                {/* Header Mock */}
                <div className="flex justify-between items-center mb-2">
                  <div className="h-8 w-40 bg-white/10 rounded-md"></div>
                  <div className="h-10 w-32 bg-primary/20 rounded-md"></div>
                </div>
                
                {/* Cards Mock */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="h-28 bg-white/5 rounded-xl border border-white/5 p-5 flex flex-col justify-between">
                    <div className="h-4 w-20 bg-white/20 rounded"></div>
                    <div className="h-8 w-32 bg-white/10 rounded"></div>
                  </div>
                  <div className="h-28 bg-white/5 rounded-xl border border-white/5 p-5 flex flex-col justify-between">
                    <div className="h-4 w-20 bg-white/20 rounded"></div>
                    <div className="h-8 w-32 bg-white/10 rounded"></div>
                  </div>
                  <div className="h-28 bg-white/5 rounded-xl border border-white/5 p-5 flex flex-col justify-between">
                    <div className="h-4 w-20 bg-white/20 rounded"></div>
                    <div className="h-8 w-32 bg-white/10 rounded"></div>
                  </div>
                </div>

                {/* Table Mock */}
                <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-5 flex flex-col gap-4">
                  <div className="h-6 w-1/4 bg-white/10 rounded"></div>
                  <div className="space-y-3">
                    <div className="h-12 w-full bg-white/5 rounded-md"></div>
                    <div className="h-12 w-full bg-white/5 rounded-md"></div>
                    <div className="h-12 w-full bg-white/5 rounded-md"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle reflection overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none"></div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Hero;
