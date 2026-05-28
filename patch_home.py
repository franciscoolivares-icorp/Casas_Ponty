import re

with open('/Users/olaf/Documents/inventario-ponty/components/Home.tsx', 'r') as f:
    content = f.read()

# Add currentUser to HomeProps
content = content.replace("interface HomeProps {\n  properties: Propiedad[];", "interface HomeProps {\n  properties: Propiedad[];\n  currentUser?: any;")

# Update Home component signature
content = content.replace("export const Home: React.FC<HomeProps> = ({ properties, onNavigateToApartados }) => {", "export const Home: React.FC<HomeProps> = ({ properties, onNavigateToApartados, currentUser }) => {")

# Filter properties by Coordinador
filter_logic = """
  const isCoordinador = currentUser?.tipo_usuario === 'COORDINADOR';
  const desarrollosAsignados = currentUser?.desarrollos_asignados || [];
  
  const propertiesWithAccess = useMemo(() => {
    if (isCoordinador) {
       return properties.filter(p => desarrollosAsignados.includes(p.desarrollo || ''));
    }
    return properties;
  }, [properties, isCoordinador, desarrollosAsignados]);

  const desarrollosDisponibles = useMemo(() => {
     return Array.from(new Set(propertiesWithAccess.map(p => p.desarrollo).filter(Boolean))).sort();
  }, [propertiesWithAccess]);

  const filteredProperties = useMemo(() => {
     if (!selectedDesarrollo) return propertiesWithAccess;
     return propertiesWithAccess.filter(p => p.desarrollo === selectedDesarrollo);
  }, [propertiesWithAccess, selectedDesarrollo]);
"""

# Replace the original desarrollosDisponibles and filteredProperties
content = re.sub(
    r"  const desarrollosDisponibles = useMemo\(\(\) => \{.*?\n  \}, \[properties, selectedDesarrollo\]\);", 
    filter_logic.strip(), 
    content, 
    flags=re.DOTALL
)

with open('/Users/olaf/Documents/inventario-ponty/components/Home.tsx', 'w') as f:
    f.write(content)

print("Home.tsx patched")
