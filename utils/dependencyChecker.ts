
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface DependencyCheckResult {
  isReady: boolean;
  missingDependencies: string[];
  setupCommands: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ProjectConfig {
  hasPackageJson: boolean;
  hasSupabaseConfig: boolean;
  hasTsConfig: boolean;
  hasExpoConfig: boolean;
  nodeModulesExists: boolean;
  supabaseLinked: boolean;
}

class DependencyChecker {
  private static instance: DependencyChecker;
  
  public static getInstance(): DependencyChecker {
    if (!DependencyChecker.instance) {
      DependencyChecker.instance = new DependencyChecker();
    }
    return DependencyChecker.instance;
  }

  /**
   * Scans the project configuration files and checks for missing dependencies
   */
  async checkProjectSetup(): Promise<DependencyCheckResult> {
    const result: DependencyCheckResult = {
      isReady: true,
      missingDependencies: [],
      setupCommands: [],
      warnings: [],
      recommendations: [],
    };

    try {
      // Check if we're in a development environment
      if (__DEV__) {
        console.log('🔍 Scanning project configuration...');
        
        const config = await this.scanProjectFiles();
        
        // Check package.json and dependencies
        await this.checkPackageJson(result, config);
        
        // Check Supabase configuration
        await this.checkSupabaseSetup(result, config);
        
        // Check TypeScript configuration
        await this.checkTypeScriptSetup(result, config);
        
        // Check Expo configuration
        await this.checkExpoSetup(result, config);
        
        // Check Node.js environment
        await this.checkNodeEnvironment(result);
        
        // Generate setup recommendations
        this.generateRecommendations(result, config);
        
        // Determine if project is ready
        result.isReady = result.missingDependencies.length === 0;
        
        console.log('✅ Project scan complete:', {
          ready: result.isReady,
          missing: result.missingDependencies.length,
          warnings: result.warnings.length,
        });
      }
    } catch (error) {
      console.error('❌ Error checking project setup:', error);
      result.warnings.push('Unable to complete full project scan');
    }

    return result;
  }

  /**
   * Safely checks if a module is available using static imports
   */
  private isModuleAvailable(moduleName: string): boolean {
    try {
      // Use static checks for known modules to avoid dynamic require() calls
      switch (moduleName) {
        case '@supabase/supabase-js':
          // Check if supabase is available by trying to access it
          try {
            const { createClient } = require('@supabase/supabase-js');
            return typeof createClient === 'function';
          } catch {
            return false;
          }
        case 'expo':
          // Check if Expo constants are available
          try {
            const Constants = require('expo-constants');
            return !!Constants.default;
          } catch {
            return false;
          }
        case 'react-native-svg':
          try {
            const Svg = require('react-native-svg');
            return !!Svg.default;
          } catch {
            return false;
          }
        case 'react-native-safe-area-context':
          try {
            const { SafeAreaProvider } = require('react-native-safe-area-context');
            return typeof SafeAreaProvider === 'function';
          } catch {
            return false;
          }
        case '@react-native-async-storage/async-storage':
          try {
            const AsyncStorage = require('@react-native-async-storage/async-storage');
            return !!AsyncStorage.default;
          } catch {
            return false;
          }
        case 'expo-router':
          try {
            const { useRouter } = require('expo-router');
            return typeof useRouter === 'function';
          } catch {
            return false;
          }
        case 'typescript':
          // TypeScript is a dev dependency, assume it's available if we're running TS code
          return true;
        default:
          console.log(`Unknown module check: ${moduleName}`);
          return false;
      }
    } catch (error) {
      console.log(`Module ${moduleName} not available:`, error);
      return false;
    }
  }

  /**
   * Scans for project configuration files
   */
  private async scanProjectFiles(): Promise<ProjectConfig> {
    const config: ProjectConfig = {
      hasPackageJson: false,
      hasSupabaseConfig: false,
      hasTsConfig: false,
      hasExpoConfig: false,
      nodeModulesExists: false,
      supabaseLinked: false,
    };

    try {
      // Check if common modules are available
      config.hasSupabaseConfig = this.isModuleAvailable('@supabase/supabase-js');
      config.hasExpoConfig = this.isModuleAvailable('expo');
      config.nodeModulesExists = this.isModuleAvailable('react-native-svg');

      // Assume package.json and tsconfig exist if we're running
      config.hasPackageJson = true;
      config.hasTsConfig = true;

    } catch (error) {
      console.error('Error scanning project files:', error);
    }

    return config;
  }

  /**
   * Checks package.json and npm dependencies
   */
  private async checkPackageJson(result: DependencyCheckResult, config: ProjectConfig) {
    if (!config.hasPackageJson) {
      result.missingDependencies.push('package.json');
      result.setupCommands.push('npm init -y');
      return;
    }

    if (!config.nodeModulesExists) {
      result.missingDependencies.push('node_modules');
      result.setupCommands.push('npm install');
    }

    // Check for critical dependencies
    const criticalDeps = [
      '@supabase/supabase-js',
      'react-native-svg',
      'expo',
      'react-native-safe-area-context',
      '@react-native-async-storage/async-storage',
    ];

    for (const dep of criticalDeps) {
      if (!this.isModuleAvailable(dep)) {
        result.missingDependencies.push(dep);
        result.setupCommands.push(`npm install ${dep}`);
      }
    }
  }

  /**
   * Checks Supabase configuration and setup
   */
  private async checkSupabaseSetup(result: DependencyCheckResult, config: ProjectConfig) {
    if (!config.hasSupabaseConfig) {
      result.missingDependencies.push('Supabase client');
      result.setupCommands.push('npm install @supabase/supabase-js');
    }

    // Check environment variables
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      result.warnings.push('EXPO_PUBLIC_SUPABASE_URL environment variable not set');
      result.recommendations.push('Set up Supabase environment variables in your .env file');
    }

    if (!supabaseKey) {
      result.warnings.push('EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable not set');
      result.recommendations.push('Add your Supabase anonymous key to environment variables');
    }

    // Check if Supabase CLI might be needed
    result.recommendations.push('Install Supabase CLI: npm install -g supabase');
    result.recommendations.push('Login to Supabase: supabase login');
  }

  /**
   * Checks TypeScript configuration
   */
  private async checkTypeScriptSetup(result: DependencyCheckResult, config: ProjectConfig) {
    if (!config.hasTsConfig) {
      result.warnings.push('tsconfig.json not found');
      result.recommendations.push('Initialize TypeScript: npx tsc --init');
    }

    if (!this.isModuleAvailable('typescript')) {
      result.missingDependencies.push('typescript');
      result.setupCommands.push('npm install -D typescript @types/react @types/react-native');
    }
  }

  /**
   * Checks Expo configuration
   */
  private async checkExpoSetup(result: DependencyCheckResult, config: ProjectConfig) {
    if (!config.hasExpoConfig) {
      result.missingDependencies.push('Expo CLI');
      result.setupCommands.push('npm install -g @expo/cli');
    }

    if (!this.isModuleAvailable('expo-router')) {
      result.missingDependencies.push('expo-router');
      result.setupCommands.push('npm install expo-router');
    }
  }

  /**
   * Checks Node.js environment
   */
  private async checkNodeEnvironment(result: DependencyCheckResult) {
    // Check Node.js version (this is approximate in React Native)
    const nodeVersion = Platform.constants?.reactNativeVersion;
    
    if (nodeVersion) {
      result.recommendations.push(`React Native version: ${nodeVersion.major}.${nodeVersion.minor}.${nodeVersion.patch}`);
    }

    // Platform-specific recommendations
    if (Platform.OS === 'ios') {
      result.recommendations.push('For iOS development: Ensure Xcode is installed and up to date');
      result.recommendations.push('Install iOS Simulator if needed');
    } else if (Platform.OS === 'android') {
      result.recommendations.push('For Android development: Ensure Android Studio is installed');
      result.recommendations.push('Set up Android SDK and emulator');
    }
  }

  /**
   * Generates setup recommendations based on the scan results
   */
  private generateRecommendations(result: DependencyCheckResult, config: ProjectConfig) {
    // Add general recommendations
    result.recommendations.push('Run "npm audit" to check for security vulnerabilities');
    result.recommendations.push('Keep dependencies up to date with "npm update"');
    
    if (result.missingDependencies.length > 0) {
      result.recommendations.push('Install missing dependencies before running the app');
    }

    // VS Code specific recommendations
    result.recommendations.push('VS Code Extensions: React Native Tools, ES7+ React/Redux/React-Native snippets');
    result.recommendations.push('VS Code Extensions: TypeScript Importer, Auto Rename Tag');
    
    // Development workflow recommendations
    result.recommendations.push('Use "npm run dev" to start the development server');
    result.recommendations.push('Use "npm run android" or "npm run ios" for platform-specific builds');
  }

  /**
   * Formats the dependency check results for display
   */
  formatResults(result: DependencyCheckResult): string {
    let output = '\n🔧 PROJECT SETUP ANALYSIS\n';
    output += '========================\n\n';

    if (result.isReady) {
      output += '✅ Project appears to be ready for development!\n\n';
    } else {
      output += '⚠️  Setup issues detected. Please address the following:\n\n';
    }

    if (result.missingDependencies.length > 0) {
      output += '📦 MISSING DEPENDENCIES:\n';
      result.missingDependencies.forEach(dep => {
        output += `   • ${dep}\n`;
      });
      output += '\n';
    }

    if (result.setupCommands.length > 0) {
      output += '🛠️  REQUIRED SETUP COMMANDS:\n';
      result.setupCommands.forEach((cmd, index) => {
        output += `   ${index + 1}. ${cmd}\n`;
      });
      output += '\n';
    }

    if (result.warnings.length > 0) {
      output += '⚠️  WARNINGS:\n';
      result.warnings.forEach(warning => {
        output += `   • ${warning}\n`;
      });
      output += '\n';
    }

    if (result.recommendations.length > 0) {
      output += '💡 RECOMMENDATIONS:\n';
      result.recommendations.forEach(rec => {
        output += `   • ${rec}\n`;
      });
      output += '\n';
    }

    output += '📚 For more help, check the project documentation or README.\n';
    
    return output;
  }
}

export const dependencyChecker = DependencyChecker.getInstance();

/**
 * Quick check function for use in components
 */
export const quickDependencyCheck = async (): Promise<boolean> => {
  try {
    const result = await dependencyChecker.checkProjectSetup();
    
    if (!result.isReady) {
      console.warn('🚨 Project setup issues detected:');
      console.warn(dependencyChecker.formatResults(result));
    }
    
    return result.isReady;
  } catch (error) {
    console.error('Error during dependency check:', error);
    return false;
  }
};
