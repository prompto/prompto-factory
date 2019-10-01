package prompto.codefactory;

import java.io.IOException;
import java.net.URL;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import prompto.code.BaseCodeStore;
import prompto.code.Dependency;
import prompto.code.ICodeStore;
import prompto.code.ImmutableCodeStore;
import prompto.code.Library;
import prompto.code.Module;
import prompto.code.QueryableCodeStore;
import prompto.config.CodeFactoryConfiguration;
import prompto.config.ICodeFactoryConfiguration;
import prompto.config.IConfigurationReader;
import prompto.config.IPortRangeConfiguration;
import prompto.config.IStoreConfiguration;
import prompto.config.ITargetConfiguration;
import prompto.config.auth.IAuthenticationConfiguration;
import prompto.config.auth.source.IAuthenticationSourceConfiguration;
import prompto.config.auth.source.IStoredAuthenticationSourceConfiguration;
import prompto.intrinsic.PromptoVersion;
import prompto.libraries.Libraries;
import prompto.runtime.Mode;
import prompto.runtime.Standalone;
import prompto.server.AppServer;
import prompto.server.DataServlet;
import prompto.store.DataStore;
import prompto.store.IStore;
import prompto.store.IStoreFactory;
import prompto.utils.CmdLineParser;
import prompto.utils.Logger;
import prompto.utils.ResourceUtils;

public class Application {

	static Logger logger = new Logger();
	static ICodeFactoryConfiguration config;
	
	public static void main(String[] args) throws Throwable {
		main(args, null);
	}
	
	public static void main(String[] args, Mode runtimeMode) throws Throwable {
		ICodeFactoryConfiguration config = loadConfiguration(args);
		config = adjustConfiguration(config, runtimeMode);
		main(config);
	}
	
	public static void main(ICodeFactoryConfiguration config) throws Throwable {
		Application.config = config;
		AppServer.main(config, Application::init); 
	}
	
	public static ICodeFactoryConfiguration loadConfiguration(String[] args) throws Exception {
		Map<String, String> argsMap = CmdLineParser.read(args);
		IConfigurationReader reader = Standalone.readerFromArgs(argsMap);
		ICodeFactoryConfiguration config = new CodeFactoryConfiguration(reader, argsMap);
		return config.withRuntimeLibs(()->Libraries.getPromptoLibraries(Libraries.class, AppServer.class, BaseCodeStore.class));
	}

	public static ICodeFactoryConfiguration adjustConfiguration(ICodeFactoryConfiguration config, Mode runtimeMode) throws Exception {
		config = config.withServerAboutToStartMethod("serverAboutToStart")
				.withHttpConfiguration(config.getHttpConfiguration().withSendsXAuthorization(true))
				.withApplicationName("CodeFactory")
				.withApplicationVersion(PromptoVersion.LATEST)
				.withResourceURLs(Application.getResourceURLs());
		if(runtimeMode!=null)
			config = config.withRuntimeMode(runtimeMode);
		return config;
	}
	
	
	private static void init(ICodeFactoryConfiguration config) {
		initDataServletStores(config);
		initModuleProcessPortRange(config);
	}
	
	private static void initModuleProcessPortRange(ICodeFactoryConfiguration config) {
		try {
			ITargetConfiguration target = config.getTargetConfiguration();
			if(target!=null) {
				IPortRangeConfiguration portRange = target.getPortRangeConfiguration();
				if(portRange!=null) {
					logger.info(()->"Target port range is " + portRange.getMinPort() + " to " + portRange.getMaxPort());
					ModuleProcess.portRangeConfiguration = portRange;
				}
			}
		} catch(Throwable t) {
			throw new RuntimeException(t);
		}		
	}

	private static void initDataServletStores(ICodeFactoryConfiguration config) {
		try {
			Map<String, IStore> stores = new HashMap<>();
			IStore store = fetchLoginStore(config);
			if(store!=null)
				stores.put("LOGIN", store);
			store = DataStore.getInstance();
			if(store!=null)
				stores.put("APPS", store);
			store = readTargetStoreConfiguration(config);
			if(store!=null)
				stores.put("DATA", store);
			DataServlet.setStores(stores);
		} catch(Throwable t) {
			throw new RuntimeException(t);
		}
	}

	private static IStore readTargetStoreConfiguration(ICodeFactoryConfiguration config) throws Throwable {
		ITargetConfiguration target = config.getTargetConfiguration();
		return target == null ? null : newStore(target.getDataStoreConfiguration());
	}

	public static IStore fetchLoginStore(ICodeFactoryConfiguration config) throws Throwable {
		IAuthenticationConfiguration auth = config.getHttpConfiguration()
			.getAuthenticationConfiguration();
		return auth==null ? null : fetchLoginStore(auth);
	}

	private static IStore fetchLoginStore(IAuthenticationConfiguration config) throws Throwable {
		IAuthenticationSourceConfiguration source = config.getAuthenticationSourceConfiguration();
		if(source instanceof IStoredAuthenticationSourceConfiguration)
			return newStore(((IStoredAuthenticationSourceConfiguration)source).getStoreConfiguration());
		else
			return null;
	}

	private static IStore newStore(IStoreConfiguration config) throws Throwable {
		if(config==null)
			return null;
		else {
			IStoreFactory factory = IStoreFactory.newStoreFactory(config.getFactory());
			return factory.newStore(config);
		}
	}

	private static URL[] getResourceURLs() {
		Collection<URL> urls = Libraries.getPromptoLibraries(BaseCodeStore.class, Application.class);
		return urls.toArray(new URL[urls.size()]);
	}

	public static void createLibraries() {
		try {
			ICodeStore codeStore = codeStoreUsingDataStore();
			createResourceLibraries(codeStore, "thesaurus/", "react-bootstrap-3/");
			if(isToolsDataStore())
				createToolsLibraries(codeStore);
		} catch(Throwable t) {
			t.printStackTrace();
		}
	}
	
	
	private static void createResourceLibraries(ICodeStore codeStore, String ... resources) throws Exception {
		for(String resource : resources) {
			URL url = Thread.currentThread().getContextClassLoader().getResource(resource);
			doImportModule(codeStore, url);
		}
	}

	private static ICodeStore codeStoreUsingDataStore() {
		ICodeStore runtime = ImmutableCodeStore.bootstrapRuntime(()->Libraries.getPromptoLibraries(Libraries.class, AppServer.class));
		return new QueryableCodeStore(DataStore.getInstance(), runtime, null, null, null);
	}

	private static void doImportModule(ICodeStore codeStore, URL url) throws Exception {
		SampleImporter importer = new SampleImporter(url);
		importer.importModule(codeStore);
	}

	public static void importSamples(String root) throws IOException {
		Collection<URL> samples = ResourceUtils.listResourcesAt(root, null);
		samples.forEach(Application::importSample);
	}
	
	public static void importSample(String name) {
		importSample(Thread.currentThread().getContextClassLoader().getResource(name));
	}
	
	public static void importSample(URL sample) {
		try {
			ICodeStore codeStore = codeStoreUsingDataStore();
			doImportModule(codeStore, sample);
		} catch(Throwable t) {
			t.printStackTrace();
		}
	}
	

	private static void createToolsLibraries(ICodeStore codeStore) throws Exception {
		Module codeStoreLibrary = new Library();
		codeStoreLibrary.setName("CodeStore");
		codeStoreLibrary.setVersion(PromptoVersion.parse("1.0.0.0"));
		codeStoreLibrary.setDescription("Code store model");
		URL url = Thread.currentThread().getContextClassLoader().getResource("libraries/CodeStore.pec");
		SampleImporter importer = new SampleImporter(codeStoreLibrary, null, url);
		importer.importModule(codeStore);
		Module appStoreLibrary = new Library();
		appStoreLibrary.setName("AppStore");
		appStoreLibrary.setVersion(PromptoVersion.parse("1.0.0.0"));
		appStoreLibrary.setDescription("App store model");
		Dependency dependency = new Dependency();
		dependency.setName(codeStoreLibrary.getName());
		dependency.setVersion(codeStoreLibrary.getVersion());
		appStoreLibrary.setDependencies(Collections.singletonList(dependency));
		url = Thread.currentThread().getContextClassLoader().getResource("libraries/AppStore.pec");
		importer = new SampleImporter(appStoreLibrary, null, url);
		importer.importModule(codeStore);
	}

	private static boolean isToolsDataStore() {
		return config.getDataStoreConfiguration().getDbName().toLowerCase().contains("tools");
	}




}
