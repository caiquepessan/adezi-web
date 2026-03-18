import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Wine, Mail, Lock, User, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReCAPTCHA from 'react-google-recaptcha';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (!captchaToken) {
      setErrorMsg('Por favor, confirme que você não é um robô (Captcha).');
      setLoading(false);
      return;
    }
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            adega_name: name
          }
        }
      });

      if (error) throw error;
      
      setSuccessMsg("Conta criada com sucesso! Verifique seu email.");
    } catch (error: any) {
      console.error("Registration error:", error);
      setErrorMsg(error.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[50rem] h-[50rem] bg-primary/10 rounded-full blur-[120px] opacity-30" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-500/10 rounded-full blur-[100px] opacity-40" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flexjustify-center mb-8 flex items-center justify-center">
          <Link to="/" className="flex items-center space-x-2 group">
             <div className="bg-primary/20 p-2 rounded-xl group-hover:bg-primary/30 transition-colors">
              <Wine className="w-8 h-8 text-primary" />
            </div>
            <span className="text-3xl font-bold tracking-tight">ADEZI</span>
          </Link>
        </div>

        <div className="glass-panel p-8 rounded-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Criar sua conta</h2>
            <p className="text-muted-foreground">O primeiro passo para o controle total</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Nome da Adega</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Adega Central"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Confirmar Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl text-sm">
                {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-xl text-sm">
                {successMsg}
              </div>
            )}

            <div className="flex justify-center py-2">
              <ReCAPTCHA
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                onChange={(token) => setCaptchaToken(token)}
                theme="dark"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white hover:bg-gray-200 text-black py-3.5 rounded-xl font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all flex items-center justify-center group mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              {loading ? "Criando..." : "Criar Conta Adezi"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Já possui uma conta?{' '}
            <Link to="/login" className="text-white hover:text-primary transition-colors font-medium">
              Faça login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
