
import { Wine, Instagram, Twitter, Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-background/50 backdrop-blur-md pt-16 pb-8 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1 md:col-span-2">
            <div className="mb-6">
              <img src="/logo-full.svg" alt="Adezi Logo" className="h-12" />
            </div>
            <p className="text-muted-foreground w-3/4 mb-6">
              O sistema de gestão definitivo para adegas e distribuidoras de bebidas. Rápido, offline e extremamente fácil de usar.
            </p>
            <div className="flex space-x-4 text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="hover:text-primary transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="hover:text-primary transition-colors"><Github className="w-5 h-5" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Produto</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#features" className="hover:text-white transition-colors">Recursos</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Download Desktop</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Atualizações</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-lg">Legal</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Adezi. Todos os direitos reservados.
          </p>
          <div className="text-sm text-muted-foreground mt-2 md:mt-0 flex items-center space-x-2">
            <span>Gestão inteligente para o seu negócio</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
