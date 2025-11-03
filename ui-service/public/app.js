class RecipeManager {
    constructor() {
        this.initializeEventListeners();
        this.loadRecipes();
    }

    initializeEventListeners() {
        // Form submission
        const recipeForm = document.getElementById('recipeForm');
        recipeForm.addEventListener('submit', this.handleSubmit.bind(this));

        // Add ingredient button
        const addIngredientBtn = document.getElementById('addIngredient');
        addIngredientBtn.addEventListener('click', this.addIngredientField.bind(this));

        // Initial remove ingredient listeners
        this.updateRemoveButtons();
    }

    addIngredientField() {
        const container = document.getElementById('ingredientsContainer');
        const ingredientDiv = document.createElement('div');
        ingredientDiv.className = 'ingredient-input';
        
        ingredientDiv.innerHTML = `
            <input type="text" name="ingredient" placeholder="Enter an ingredient" required>
            <button type="button" class="remove-ingredient">×</button>
        `;
        
        container.appendChild(ingredientDiv);
        
        // Add event listener to the new remove button
        const removeBtn = ingredientDiv.querySelector('.remove-ingredient');
        removeBtn.addEventListener('click', () => this.removeIngredientField(ingredientDiv));
        
        this.updateRemoveButtons();
        
        // Focus on the new input
        ingredientDiv.querySelector('input').focus();
    }

    removeIngredientField(ingredientDiv) {
        ingredientDiv.remove();
        this.updateRemoveButtons();
    }

    updateRemoveButtons() {
        const ingredientInputs = document.querySelectorAll('.ingredient-input');
        const removeButtons = document.querySelectorAll('.remove-ingredient');
        
        // Show/hide remove buttons based on number of ingredient fields
        removeButtons.forEach(btn => {
            btn.style.display = ingredientInputs.length > 1 ? 'flex' : 'none';
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const recipeName = formData.get('recipeName').trim();
        const ingredientInputs = document.querySelectorAll('input[name="ingredient"]');
        
        // Collect all ingredients
        const ingredients = [];
        ingredientInputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                ingredients.push(value);
            }
        });

        if (!recipeName) {
            this.showNotification('Please enter a recipe name', 'error');
            return;
        }

        if (ingredients.length === 0) {
            this.showNotification('Please add at least one ingredient', 'error');
            return;
        }

        try {
            const response = await fetch(`/recipe/${encodeURIComponent(recipeName)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ingredients })
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(`Recipe "${recipeName}" saved successfully!`, 'success');
                this.resetForm();
                this.loadRecipes(); // Refresh the recipes list
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Failed to save recipe', 'error');
            }
        } catch (error) {
            console.error('Error saving recipe:', error);
            this.showNotification('Failed to save recipe. Please try again.', 'error');
        }
    }

    resetForm() {
        document.getElementById('recipeForm').reset();
        
        // Remove all but the first ingredient field
        const container = document.getElementById('ingredientsContainer');
        const ingredientInputs = container.querySelectorAll('.ingredient-input');
        
        for (let i = 1; i < ingredientInputs.length; i++) {
            ingredientInputs[i].remove();
        }
        
        this.updateRemoveButtons();
    }

    async loadRecipes() {
        const recipesList = document.getElementById('recipesList');
        
        try {
            const response = await fetch('/api/recipes');
            
            if (!response.ok) {
                throw new Error('Failed to fetch recipes');
            }
            
            const recipes = await response.json();
            
            if (recipes.length === 0) {
                recipesList.innerHTML = `
                    <div class="empty-state">
                        <h3>No recipes yet</h3>
                        <p>Add your first recipe using the form above!</p>
                    </div>
                `;
                return;
            }
            
            // Sort recipes alphabetically
            recipes.sort((a, b) => a.name.localeCompare(b.name));
            
            recipesList.innerHTML = recipes.map(recipe => `
                <div class="recipe-card">
                    <h3>${this.escapeHtml(recipe.name)}</h3>
                    <ul class="ingredients-list">
                        ${recipe.ingredients.map(ingredient => 
                            `<li>${this.escapeHtml(ingredient)}</li>`
                        ).join('')}
                    </ul>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Error loading recipes:', error);
            recipesList.innerHTML = `
                <div class="empty-state">
                    <h3>Error loading recipes</h3>
                    <p>Please refresh the page to try again.</p>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} visible`;
        
        // Hide notification after 4 seconds
        setTimeout(() => {
            notification.className = `notification ${type} hidden`;
        }, 4000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the recipe manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RecipeManager();
});

// Add some keyboard shortcuts for better UX
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const submitBtn = document.querySelector('.btn-primary');
        if (submitBtn) {
            submitBtn.click();
        }
    }
    
    // Escape to clear form
    if (e.key === 'Escape') {
        const recipeNameInput = document.getElementById('recipeName');
        if (document.activeElement === recipeNameInput || 
            document.activeElement.name === 'ingredient') {
            if (confirm('Clear the form?')) {
                document.getElementById('recipeForm').reset();
            }
        }
    }
});