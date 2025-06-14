import puppeteer from 'puppeteer';

async function testRecipeCreation() {
  console.log('Starting recipe creation test...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Go to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3002/auth/login');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    // Login
    console.log('2. Logging in...');
    await page.type('input[name="email"]', 'demo@recipekeeper.com');
    await page.type('input[name="password"]', 'DemoRecipes2024!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✅ Logged in successfully');
    
    // Go to recipe creation page
    console.log('\n3. Navigating to recipe creation page...');
    await page.goto('http://localhost:3002/protected/recipes/new');
    await page.waitForSelector('input[name="title"]', { timeout: 10000 });
    
    // Fill basic info
    console.log('4. Filling recipe basic info...');
    await page.type('input[name="title"]', "Grandma's Chocolate Chip Cookies");
    await page.type('textarea[name="description"]', "The best chocolate chip cookies you'll ever taste");
    
    // Add ingredients
    console.log('5. Adding ingredients...');
    const ingredientButton = await page.$('button:has-text("Add Ingredient")');
    if (ingredientButton) {
      await ingredientButton.click();
      await page.waitForTimeout(500);
      const ingredientInput = await page.$('input[placeholder*="ingredient"]');
      if (ingredientInput) {
        await ingredientInput.type('2 1/4 cups all-purpose flour');
      }
    }
    
    // Add instructions
    console.log('6. Adding instructions...');
    const instructionButton = await page.$('button:has-text("Add Instruction")');
    if (instructionButton) {
      await instructionButton.click();
      await page.waitForTimeout(500);
      const instructionInput = await page.$('textarea[placeholder*="instruction"]');
      if (instructionInput) {
        await instructionInput.type('Preheat oven to 375°F');
      }
    }
    
    // Fill timing info
    console.log('7. Filling timing info...');
    await page.type('input[name="prepTime"]', '15');
    await page.type('input[name="cookTime"]', '12');
    await page.type('input[name="servings"]', '24');
    
    // Submit the form
    console.log('8. Submitting recipe...');
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      
      // Wait for success (redirect or success message)
      await page.waitForTimeout(3000);
      
      // Check if we're redirected to the recipe list
      const currentUrl = page.url();
      if (currentUrl.includes('/protected/recipes') && !currentUrl.includes('/new')) {
        console.log('✅ Recipe created successfully! Redirected to recipe list.');
      } else {
        console.log('Current URL:', currentUrl);
        
        // Take a screenshot for debugging
        await page.screenshot({ path: '/tmp/recipe-creation-result.png' });
        console.log('Screenshot saved to /tmp/recipe-creation-result.png');
      }
    }
    
    // Check the recipe list
    console.log('\n9. Checking recipe list...');
    await page.goto('http://localhost:3002/protected/recipes');
    await page.waitForTimeout(2000);
    
    const recipeTitle = await page.$eval('h3', el => el.textContent).catch(() => null);
    if (recipeTitle && recipeTitle.includes('Chocolate Chip Cookies')) {
      console.log('✅ Recipe found in list!');
    } else {
      console.log('Recipe list content:', await page.content());
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testRecipeCreation().catch(console.error);