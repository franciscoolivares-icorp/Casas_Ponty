import re

with open('/Users/olaf/Documents/inventario-ponty/components/PropertyForm.tsx', 'r') as f:
    content = f.read()

# Replace setFormData with handleFieldChange
pattern = r"onChange=\{v => setFormData\(\{\.\.\.formData,\s*([a-zA-Z0-9_]+):\s*([^}]+)\}\)\}"
replacement = r"onChange={v => handleFieldChange('\1', \2)}"

new_content = re.sub(pattern, replacement, content)

# Add handleFieldChange implementation inside the component
# find the line `const validateAndSubmit =` and insert before it
insert_code = """
  const handleFieldChange = (field: keyof Propiedad, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (isEditing && onInlineUpdate) {
      // Create partial update object
      const updateData: Partial<Propiedad> = { idPropiedad: formData.idPropiedad, [field]: value };
      
      // Handle computed fields that might depend on this change immediately
      if (field === 'estado') {
        if (['DISPONIBLE', 'PRODUCCIÓN'].includes(value || '')) updateData.precioOperacion = 0;
        else if (value === 'APARTADO') updateData.precioOperacion = formData.precioFinal;
      }
      onInlineUpdate(updateData);
    }
  };

"""

new_content = new_content.replace("  const validateAndSubmit = (e?: React.FormEvent) => {", insert_code + "  const validateAndSubmit = (e?: React.FormEvent) => {")

# Add onInlineUpdate to props
new_content = new_content.replace(
  "  onSubmit: (property: Partial<Propiedad>) => void;",
  "  onSubmit: (property: Partial<Propiedad>) => void;\n  onInlineUpdate?: (property: Partial<Propiedad>) => void;"
)

new_content = new_content.replace(
  "  onSubmit,\n  onCancel,",
  "  onSubmit,\n  onInlineUpdate,\n  onCancel,"
)

# Hide the Guardar Cambios button if isEditing is true
new_content = new_content.replace(
  "{!isViewing && (\n              <button type=\"button\" onClick={() => validateAndSubmit()}",
  "{!isViewing && !isEditing && (\n              <button type=\"button\" onClick={() => validateAndSubmit()}"
)

with open('/Users/olaf/Documents/inventario-ponty/components/PropertyForm.tsx', 'w') as f:
    f.write(new_content)

print("Done replacing.")
