import re

with open('/Users/olaf/Documents/inventario-ponty/components/Apartados.tsx', 'r') as f:
    content = f.read()

# Add getDiffDays and getDiasDesdeRevisar
helpers = """
  const getDiffDays = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    return Math.floor((today.getTime() - d.getTime()) / (1000 * 3600 * 24));
  };
  const getDiasDesdeRevisar = (p: Propiedad) => p.fechaDesde ? (getDiffDays(p.fechaDesde) || 0) + 1 : 0;

  const [selectedDesarrollo, setSelectedDesarrollo] = useState<string>('');
"""

content = content.replace("  const [selectedDesarrollo, setSelectedDesarrollo] = useState<string>('');", helpers)

# Replace all instances of (p.diasDesdeRevisar || 0) with getDiasDesdeRevisar(p)
content = content.replace("(p.diasDesdeRevisar || 0)", "getDiasDesdeRevisar(p)")
content = content.replace("(a.diasDesdeRevisar || 0)", "getDiasDesdeRevisar(a)")
content = content.replace("(b.diasDesdeRevisar || 0)", "getDiasDesdeRevisar(b)")
content = content.replace("(prop.diasDesdeRevisar || 0)", "getDiasDesdeRevisar(prop)")

# Replace the single direct access
content = content.replace("{prop.diasDesdeRevisar}", "{getDiasDesdeRevisar(prop)}")
content = content.replace("{incidentProperty.diasDesdeRevisar}", "{getDiasDesdeRevisar(incidentProperty)}")

with open('/Users/olaf/Documents/inventario-ponty/components/Apartados.tsx', 'w') as f:
    f.write(content)

print("Patched Apartados.tsx with getDiasDesdeRevisar logic")
