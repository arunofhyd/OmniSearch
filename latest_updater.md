# OmniSearch Native Logic (With Auto-Updater)

## Features
1.  **Auto-Update**: Checks `omniisearch.netlify.app/version.txt` for updates.

## The Script

```applescript
on run {input, parameters}
	with timeout of 300 seconds
		-- 1. GET THE INPUT: 
		-- This takes the URL-encoded search term sent from your macOS Shortcut.
		set searchTerm to (item 1 of input) as string
		
		-- ==========================================
		-- 1.5. TERM EXTRACTOR (Handles full URLs passed from existing shortcuts)
		-- ==========================================
		set preSelectedEngine to ""
		set isDirectURL to false
		set oldDelims to AppleScript's text item delimiters
		
		-- Logic to handle specific service routing
		if searchTerm contains "marketingtools.apple.com" or searchTerm contains "applemediaservices.com" then
			set preSelectedEngine to "Apple Marketing"
			if searchTerm contains "?q=" then
				set AppleScript's text item delimiters to "?q="
			else if searchTerm contains "&q=" then
				set AppleScript's text item delimiters to "&q="
			end if
			try
				set searchTerm to text item 2 of searchTerm
			end try
		else if searchTerm contains "music.apple.com" then
			set preSelectedEngine to "Apple Music"
			if searchTerm contains "?term=" then
				set AppleScript's text item delimiters to "?term="
			else if searchTerm contains "&term=" then
				set AppleScript's text item delimiters to "&term="
			end if
			try
				set searchTerm to text item 2 of searchTerm
			end try
		else if searchTerm contains "google.com/search" then
			-- EXCLUSIVE: Only trigger region logic for Google SEARCH
			set preSelectedEngine to "Google"
			if searchTerm contains "?q=" then
				set AppleScript's text item delimiters to "?q="
			else if searchTerm contains "&q=" then
				set AppleScript's text item delimiters to "&q="
			end if
			try
				set tempTerm to text item 2 of searchTerm
				set AppleScript's text item delimiters to "&"
				set searchTerm to text item 1 of tempTerm
			end try
		else if searchTerm starts with "http" then
			-- BYPASS: If it's a URL but not Search/Marketing/Music, open it directly!
			-- This handles Google Maps, Wikipedia, etc., without region conflicts.
			set isDirectURL to true
		end if
		set AppleScript's text item delimiters to oldDelims
		
		-- ==========================================
		-- 2. ONE-TIME SETUP WIZARD & USER PREFS
		-- ==========================================
		-- Save to a visible file in Documents for easy access
		set docsFolder to POSIX path of (path to documents folder)
		if docsFolder does not end with "/" then set docsFolder to docsFolder & "/"
		set prefsFile to docsFolder & "OmniSearch_Preferences.txt"
		
		set isFirstRun to false
		
		-- DATA DRIVEN LOCALE LIST (Pruned as requested)
		set localeData to {¬
			"en_US|🇺🇸", "en_GB|🇬🇧", "en_IN|🇮🇳", "en_CA|🇨🇦", "en_AU|🇦🇺", "en_NZ|🇳🇿", ¬
			"en_ZA|🇿🇦", "en_SG|🇸🇬", "ar_SA|🇸🇦", "hi_IN|🇮🇳"}
		
		-- Default Variables
		set openMode to "New Window Update Tab"
		set windowSize to "fullscreen"
		set updateFrequency to "daily"
		set mktTargets to ""
		set musTargets to ""
		set googleTargets to ""
		
		try
			-- Check if file exists and read contents
			do shell script "test -f " & quoted form of prefsFile
			set cachedPrefs to do shell script "cat " & quoted form of prefsFile
			
			if cachedPrefs is "" then
				set isFirstRun to true
			else
				set prefLines to paragraphs of cachedPrefs
				set foundData to false
				
				-- Parse the Key: Value structure safely
				repeat with p in prefLines
					if p starts with "Mode: " then
						set openMode to text 7 thru -1 of p
						set foundData to true
					else if p starts with "Size: " then
						set windowSize to text 7 thru -1 of p
					else if p starts with "Update Frequency: " then
						set updateFrequency to text 19 thru -1 of p
					else if p starts with "Apple Marketing: " then
						set mktTargets to text 18 thru -1 of p
					else if p starts with "Apple Music: " then
						set musTargets to text 14 thru -1 of p
					else if p starts with "Google: " then
						set googleTargets to text 9 thru -1 of p
					end if
				end repeat
				
				-- If the file didn't contain core keys, trigger setup
				if not foundData then set isFirstRun to true
			end if
		on error
			set isFirstRun to true
		end try
		
		-- ==========================================
		-- SETUP WIZARD
		-- ==========================================
		if isFirstRun then
			tell application (path to frontmost application as text)
				-- Welcome Screen
				set welcomeText to "Welcome to OmniSearch! 🚀" & return & return
				set welcomeText to welcomeText & "Let's quickly set up your preferences."
				set welcomeResponse to display dialog welcomeText with title "OmniSearch Setup (1/6)" buttons {"Skip (Use Defaults)", "Let's Go!"} default button "Let's Go!" with icon note
				
				-- Base Defaults initialized for Skip
				set updateFrequency to "daily"
				set validMkt to {"Apple Marketing (en_US) 🇺🇸"}
				set validMus to {"Apple Music (en_US) 🇺🇸"}
				set validGoog to {"Google (en_US) 🇺🇸"}
				
				if button returned of welcomeResponse is "Let's Go!" then
					-- Question 1: Open Mode
					set modeOptions to {"1. New Window Update Tab (Default) 🪟", "2. New Window New Tab 🪟", "3. Same Window New Tab 📑", "4. Same Window Update Tab 🔄"}
					set chosenModeList to choose from list modeOptions with prompt ("How would you like OmniSearch to open your searches?" & return) default items {item 1 of modeOptions} with title "OmniSearch Setup (2/6)"
					if chosenModeList is not false then
						set chosenMode to item 1 of chosenModeList
						if chosenMode contains "New Window Update Tab" then set openMode to "New Window Update Tab"
						if chosenMode contains "New Window New Tab" then set openMode to "New Window New Tab"
						if chosenMode contains "Same Window New Tab" then set openMode to "Same Window New Tab"
						if chosenMode contains "Same Window Update Tab" then set openMode to "Same Window Update Tab"
					end if
					
					-- Question 2: Window Size 
					if openMode contains "New Window" then
						set sizeOptions to {"1. Fullscreen 🖥️", "2. Left Half ⬅️", "3. Right Half ➡️", "4. Top Half ⬆️", "5. Bottom Half ⬇️", "6. Center 🎯"}
						set chosenSizeList to choose from list sizeOptions with prompt ("Choose your preferred window size:" & return) default items {item 1 of sizeOptions} with title "OmniSearch Setup (3/6)"
						if chosenSizeList is not false then
							set chosenSize to item 1 of chosenSizeList
							if chosenSize contains "Fullscreen" then set windowSize to "fullscreen"
							if chosenSize contains "Left" then set windowSize to "left"
							if chosenSize contains "Right" then set windowSize to "right"
							if chosenSize contains "Top" then set windowSize to "top"
							if chosenSize contains "Bottom" then set windowSize to "bottom"
							if chosenSize contains "Center" then set windowSize to "center"
						end if
					end if
					
					-- Question 3: Update Frequency
					set updateOptions to {"1. 📆 Daily (Recommended)", "2. 🗓️ Weekly", "3. ⚡️ Always (Check every run)"}
					set chosenUpdateList to choose from list updateOptions with prompt ("How often should we check the server for OmniSearch updates?" & return) default items {item 1 of updateOptions} with title "OmniSearch Setup (4/6)"
					if chosenUpdateList is not false then
						set chosenUpdate to item 1 of chosenUpdateList
						if chosenUpdate contains "Daily" then set updateFrequency to "daily"
						if chosenUpdate contains "Weekly" then set updateFrequency to "weekly"
						if chosenUpdate contains "Always" then set updateFrequency to "always"
					end if
					
					-- Question 4: Select Search Engines
					set engineOptions to {"1. Apple Marketing 📺", "2. Apple Music 🎵", "3. Google 🔍"}
					set chosenEnginesList to choose from list engineOptions with prompt ("Select the search engines you want to enable:" & return & "(Hold Command ⌘ to select multiple)" & return) default items {item 1 of engineOptions} with title "OmniSearch Setup (5/6)" with multiple selections allowed
					
					set cleanTargetList to {}
					if chosenEnginesList is not false then
						repeat with chosenEng in chosenEnginesList
							set oldDelims to AppleScript's text item delimiters
							set AppleScript's text item delimiters to " "
							set engPieces to text items of chosenEng
							-- Reconstruct name without the leading number and trailing icon
							set engName to items 2 thru -2 of engPieces as string
							set AppleScript's text item delimiters to oldDelims
							
							-- Build locale options specifically for this engine
							set totalLocales to count of localeData
							set locOptions to {"0. [ADD ALL REGIONS] 🌍"}
							set optCounter to 1
							repeat with locItem in localeData
								set oldDelims to AppleScript's text item delimiters
								set AppleScript's text item delimiters to "|"
								set locCode to text item 1 of locItem
								set locFlag to text item 2 of locItem
								set AppleScript's text item delimiters to oldDelims
								
								-- Dynamic Logic: 01. if >9 items, else 1.
								if optCounter is 1 and totalLocales > 9 then
									set numPrefix to "01"
								else
									set numPrefix to (optCounter as string)
								end if
								
								set end of locOptions to numPrefix & ". " & locCode & " " & locFlag
								set optCounter to optCounter + 1
							end repeat
							
							set chosenLocales to choose from list locOptions with prompt ("Select regions for " & engName & ":" & return & "(Hold Command ⌘ to select multiple)" & return) default items {item 2 of locOptions} with title "OmniSearch Setup (6/6)" with multiple selections allowed
							
							if chosenLocales is not false then
								set addAll to false
								repeat with checkLoc in chosenLocales
									if checkLoc contains "[ADD ALL REGIONS]" then set addAll to true
								end repeat
								
								if addAll then
									-- Add every locale for this engine
									repeat with locItem in localeData
										set oldDelims to AppleScript's text item delimiters
										set AppleScript's text item delimiters to "|"
										set pureCode to text item 1 of locItem
										set pureFlag to text item 2 of locItem
										set AppleScript's text item delimiters to oldDelims
										set end of cleanTargetList to engName & " (" & pureCode & ") " & pureFlag
									end repeat
								else
									-- Add only selected
									repeat with cLoc in chosenLocales
										set oldDelims to AppleScript's text item delimiters
										set AppleScript's text item delimiters to ". "
										set cleanLoc to text item 2 of cLoc
										set AppleScript's text item delimiters to " "
										set pureCode to text item 1 of cleanLoc
										set pureFlag to text item 2 of cleanLoc
										set AppleScript's text item delimiters to oldDelims
										
										set end of cleanTargetList to engName & " (" & pureCode & ") " & pureFlag
									end repeat
								end if
							end if
						end repeat
					end if
					
					-- Parse selected engines into groups
					set validMkt to {}
					set validMus to {}
					set validGoog to {}
					repeat with tgt in cleanTargetList
						if tgt starts with "Apple Marketing" then set end of validMkt to tgt as string
						if tgt starts with "Apple Music" then set end of validMus to tgt as string
						if tgt starts with "Google" then set end of validGoog to tgt as string
					end repeat
					
					display dialog "Setup Complete! 🎉" & return & return & "Your preferences have been saved to your Documents folder." & return & return & "💡 TIP: Delete 'OmniSearch_Preferences.txt' in your Documents folder to reset your preferences at any time." with title "OmniSearch Setup Complete" buttons {"Start Searching"} default button "Start Searching" with icon note
				end if
				
				-- Ensure Fallbacks even if they deselected everything to prevent breaks
				if (count of validMkt) is 0 then set end of validMkt to "Apple Marketing (en_US) 🇺🇸"
				if (count of validMus) is 0 then set end of validMus to "Apple Music (en_US) 🇺🇸"
				if (count of validGoog) is 0 then set end of validGoog to "Google (en_US) 🇺🇸"
				
				-- Join strings for saving
				set oldDelims to AppleScript's text item delimiters
				set AppleScript's text item delimiters to "|"
				set mktTargets to validMkt as string
				set musTargets to validMus as string
				set googleTargets to validGoog as string
				set AppleScript's text item delimiters to oldDelims
				
				-- Save neatly structured settings
				set prefData to "[OMNISEARCH CONFIGURATION]" & return & ¬
					"Mode: " & openMode & return & ¬
					"Size: " & windowSize & return & ¬
					"Update Frequency: " & updateFrequency & return & ¬
					"Apple Marketing: " & mktTargets & return & ¬
					"Apple Music: " & musTargets & return & ¬
					"Google: " & googleTargets
				do shell script "echo " & quoted form of prefData & " > " & quoted form of prefsFile
			end tell
		end if
		
		-- ==========================================
		-- DATA VALIDATION & FALLBACK LOGIC
		-- Handles missing data if user messed up the text file manually
		-- ==========================================
		set validMkt to {}
		set validMus to {}
		set validGoog to {}
		
		set oldDelims to AppleScript's text item delimiters
		set AppleScript's text item delimiters to "|"
		
		if mktTargets is not "" then
			set tempItems to text items of mktTargets
			repeat with tgt in tempItems
				-- Only include complete locales containing parentheses
				if tgt contains "(" and tgt contains ")" then set end of validMkt to tgt as string
			end repeat
		end if
		
		if musTargets is not "" then
			set tempItems to text items of musTargets
			repeat with tgt in tempItems
				if tgt contains "(" and tgt contains ")" then set end of validMus to tgt as string
			end repeat
		end if
		
		if googleTargets is not "" then
			set tempItems to text items of googleTargets
			repeat with tgt in tempItems
				if tgt contains "(" and tgt contains ")" then set end of validGoog to tgt as string
			end repeat
		end if
		set AppleScript's text item delimiters to oldDelims
		
		-- If user deleted all complete locales for a service, default to US
		if (count of validMkt) is 0 then set end of validMkt to "Apple Marketing (en_US) 🇺🇸"
		if (count of validMus) is 0 then set end of validMus to "Apple Music (en_US) 🇺🇸"
		if (count of validGoog) is 0 then set end of validGoog to "Google (en_US) 🇺🇸"
		
		-- Create the master unified targets list for the active menu
		set userSavedTargetsList to validMkt & validMus & validGoog
		
		set customBounds to {100, 100, 1200, 800}
		set alwaysFocus to true
		set targetURL to "" -- Initialize empty
		-- ==========================================
		
		-- ==========================================
		-- 3. AUTO-UPDATE CHECK (Injected from old updater logic)
		-- ==========================================
		set currentVersion to 1.1
		set dateCache to "/tmp/omnisearch_lastcheck.txt"
		set todayDate to (current date)
		set todayDateString to short date string of todayDate
		
		-- Retrieve ISO week identifier using shell for "weekly" frequency support
		set weekIdentifier to do shell script "date +%G-W%V"
		
		set shouldCheck to false
		
		if updateFrequency is "always" then
			set shouldCheck to true
		else
			try
				set lastCheckSignature to do shell script "cat " & quoted form of dateCache
				if updateFrequency is "daily" then
					if lastCheckSignature is not equal to todayDateString then set shouldCheck to true
				else if updateFrequency is "weekly" then
					if lastCheckSignature is not equal to weekIdentifier then set shouldCheck to true
				end if
			on error
				set shouldCheck to true
			end try
		end if
		
		if shouldCheck then
			try
				-- Pinging the server with a 2-second timeout.
				-- We use 'awk' to extract just the first word (version number) from the first line of the new multi-line format.
				set remoteVersionString to do shell script "curl -s --max-time 2 https://omniisearch.netlify.app/version.txt | head -n 1 | awk '{print $1}'"
				
				if remoteVersionString is not "" then
					-- Handle decimal points safely across different system locales
					set oldDelims to AppleScript's text item delimiters
					set AppleScript's text item delimiters to "."
					set remotePieces to text items of remoteVersionString
					set AppleScript's text item delimiters to (character 2 of (0.5 as string))
					set localizedRemoteVersionString to remotePieces as string
					set AppleScript's text item delimiters to oldDelims
					
					set remoteVersion to localizedRemoteVersionString as real
					
					-- Compare versions
					if remoteVersion > currentVersion then
						-- Force the dialog to the absolute frontmost layer
						tell application (path to frontmost application as text)
							set dialogResult to display dialog "A new version of Omni Search (v" & remoteVersionString & ") is available!" & return & return & "You are currently running v" & currentVersion & ". Would you like to download the update?" with title "Omni Search Update" buttons {"Skip for now", "Open Website"} default button "Open Website"
							
							if button returned of dialogResult is "Open Website" then
								-- Get Safari PID safely
								tell application "System Events"
									set currentSafariPID to unix id of process "Safari" as text
								end tell
								
								-- Get Cache data to check if we can reuse the window
								set cacheFile to "/tmp/omnisearch_id.txt"
								set storedPID to ""
								set storedID to 0
								try
									set cachedData to do shell script "cat " & quoted form of cacheFile
									-- We use paragraph reading here to match the new cache format
									set storedPID to paragraph 1 of cachedData
									set storedID to (paragraph 2 of cachedData) as integer
								end try
								
								tell application "Safari"
									set updateTargetFound to false
									
									-- Specific check to see if OmniSearch window is open to prevent work loss
									if (storedPID is equal to currentSafariPID) and (storedID is not 0) then
										try
											if exists window id storedID then
												tell window id storedID
													set URL of current tab to "https://omniisearch.netlify.app"
													set index to 1
													set updateTargetFound to true
												end tell
											end if
										end try
									end if
									
									-- If no OmniSearch window, open a NEW window to protect active tabs
									if not updateTargetFound then
										make new document with properties {URL:"https://omniisearch.netlify.app"}
									end if
									activate
								end tell
								return input
							end if
						end tell
					end if
					
					-- Update cache signature based on current frequency
					if updateFrequency is "daily" then
						do shell script "echo " & quoted form of todayDateString & " > " & quoted form of dateCache
					else if updateFrequency is "weekly" then
						do shell script "echo " & quoted form of weekIdentifier & " > " & quoted form of dateCache
					end if
				end if
			on error
				-- Silent fail on network error to allow search to proceed
			end try
		end if
		
		-- ==========================================
		-- 4. SMART TARGET MENU & DYNAMIC URL GENERATOR
		-- ==========================================
		if isDirectURL then
			set targetURL to searchTerm
			
			-- FIX FOR INTERLINKED: Safely encode special characters (&, ?, +) in the prompt
			if targetURL contains "interlinked.apple.com/chat?prompt=" then
				set oldDelims to AppleScript's text item delimiters
				set AppleScript's text item delimiters to "?prompt="
				set baseURL to text item 1 of targetURL
				set promptText to text item 2 of targetURL
				
				set targetChars to {" ", "?", "&", "+"}
				set replaceChars to {"%20", "%3F", "%26", "%2B"}
				repeat with i from 1 to count of targetChars
					set AppleScript's text item delimiters to item i of targetChars
					set tempPieces to text items of promptText
					set AppleScript's text item delimiters to item i of replaceChars
					set promptText to tempPieces as string
				end repeat
				
				set targetURL to baseURL & "?prompt=" & promptText
				set AppleScript's text item delimiters to oldDelims
			end if
		else
			set finalChosenTarget to ""
			
			-- 4A. Identify Unique Engines Enabled
			set uniqueEngines to {}
			repeat with tgt in userSavedTargetsList
				if tgt is not "" then
					if tgt starts with "Apple Marketing" and "Apple Marketing" is not in uniqueEngines then set end of uniqueEngines to "Apple Marketing"
					if tgt starts with "Apple Music" and "Apple Music" is not in uniqueEngines then set end of uniqueEngines to "Apple Music"
					if tgt starts with "Google" and "Google" is not in uniqueEngines then set end of uniqueEngines to "Google"
				end if
			end repeat
			
			set chosenEngine to ""
			
			-- 4B. Determine Engine (Bypasses redundant prompts entirely!)
			if preSelectedEngine is not "" then
				set chosenEngine to preSelectedEngine
			else if (count of uniqueEngines) > 0 then
				set chosenEngine to item 1 of uniqueEngines
			else
				set chosenEngine to "Apple Marketing"
			end if
			
			-- 4C. Filter Targets for the Chosen Engine
			set matchingTargets to {}
			set availableRegions to {}
			
			repeat with tgt in userSavedTargetsList
				if tgt starts with chosenEngine then
					set end of matchingTargets to tgt
					
					set oldDelims to AppleScript's text item delimiters
					set AppleScript's text item delimiters to "("
					set temp1 to text item 2 of tgt
					set AppleScript's text item delimiters to ")"
					set pureCode to text item 1 of temp1
					set flagPart to text item 2 of temp1
					set AppleScript's text item delimiters to oldDelims
					
					set cleanFlag to flagPart
					if cleanFlag starts with " " then set cleanFlag to text 2 thru -1 of cleanFlag
					
					set end of availableRegions to pureCode & " " & cleanFlag
				end if
			end repeat
			
			-- 4D. Prompt for Region (If multiple regions enabled for this engine)
			-- Guard: Only show popup for the core region-capable engines
			set totalAvailableRegions to count of availableRegions
			if totalAvailableRegions > 1 and (chosenEngine is in {"Apple Marketing", "Apple Music", "Google"}) then
				set numberedRegions to {}
				set rCount to 1
				repeat with reg in availableRegions
					-- Dynamic Logic: 01. if >9 items, else 1.
					if rCount is 1 and totalAvailableRegions > 9 then
						set numPrefix to "01"
					else
						set numPrefix to (rCount as string)
					end if
					set end of numberedRegions to numPrefix & ". " & reg
					set rCount to rCount + 1
				end repeat
				
				tell application (path to frontmost application as text)
					set regionChoice to choose from list numberedRegions with prompt ("Select Region:" & return) default items {item 1 of numberedRegions} with title "OmniSearch"
					if regionChoice is not false then
						-- Logic-based index lookup to prevent "1 goes to 10" glitch
						set chosenString to item 1 of regionChoice
						repeat with i from 1 to count of numberedRegions
							if item i of numberedRegions is chosenString then
								set finalChosenTarget to item i of matchingTargets
								exit repeat
							end if
						end repeat
					else
						return input
					end if
				end tell
			else if totalAvailableRegions is 1 then
				set finalChosenTarget to item 1 of matchingTargets
			else
				-- Failsafe default
				if chosenEngine contains "Apple Marketing" then set finalChosenTarget to "Apple Marketing (en_US) 🇺🇸"
				if chosenEngine contains "Apple Music" then set finalChosenTarget to "Apple Music (en_US) 🇺🇸"
				if chosenEngine contains "Google" then set finalChosenTarget to "Google (en_US) 🇺🇸"
			end if
			
			-- ==========================================
			-- DYNAMIC EXTRACTION ENGINE
			-- Dynamic parsing directly from the parenthesis text.
			-- ==========================================
			set isMarketing to finalChosenTarget contains "Apple Marketing"
			set isMusic to finalChosenTarget contains "Apple Music"
			set isGoogleSearch to finalChosenTarget contains "Google"
			
			set oldDelims to AppleScript's text item delimiters
			set AppleScript's text item delimiters to "("
			set temp1 to text item 2 of finalChosenTarget
			set AppleScript's text item delimiters to ")"
			set extractedLocale to text item 1 of temp1
			
			-- Handle formats safely (en_US or just US if user manually edited poorly)
			set AppleScript's text item delimiters to "_"
			if (count of text items of extractedLocale) > 1 then
				set locLang to text item 1 of extractedLocale
				set locCountry to text item 2 of extractedLocale
			else
				set locLang to "en"
				set locCountry to text item 1 of extractedLocale
			end if
			set AppleScript's text item delimiters to oldDelims
			
			set lowerLocaleDash to do shell script "echo " & quoted form of extractedLocale & " | tr '[:upper:]' '[:lower:]' | tr '_' '-'"
			set lowerCountry to do shell script "echo " & quoted form of locCountry & " | tr '[:upper:]' '[:lower:]'"
			
			if isMarketing then
				set targetURL to "https://toolbox.marketingtools.apple.com/en-us?sf=" & lowerCountry & "&q=" & searchTerm
				set oldDelims to AppleScript's text item delimiters
				set AppleScript's text item delimiters to {"%2520", "%20", " "}
				set urlPieces to text items of targetURL
				set AppleScript's text item delimiters to "+"
				set targetURL to urlPieces as string
				set AppleScript's text item delimiters to oldDelims
			else if isMusic then
				set targetURL to "https://music.apple.com/" & lowerCountry & "/search?term=" & searchTerm
			else if isGoogleSearch then
				set targetURL to "https://www.google.com/search?q=" & searchTerm & "&gl=" & lowerCountry & "&hl=" & lowerLocaleDash
			end if
		end if
		
		-- ==========================================
		-- 5. SAFARI EXECUTION
		-- ==========================================
		set cacheFile to "/tmp/omnisearch_id.txt"
		set foundWindow to false
		set storedPID to ""
		set storedID to 0
		set storedURL to ""
		set storedTabIndex to 0
		
		try
			set cachedData to do shell script "cat " & quoted form of cacheFile
			set storedPID to paragraph 1 of cachedData
			set storedID to (paragraph 2 of cachedData) as integer
			try
				set storedURL to paragraph 3 of cachedData
			end try
			try
				set storedTabIndex to (paragraph 4 of cachedData) as integer
			end try
		on error
		end try
		
		tell application "System Events" to set safariRunning to exists process "Safari"
		if (safariRunning is false) then
			tell application "Safari" to activate
			set wakeCounter to 0
			repeat until safariRunning or wakeCounter > 50
				tell application "System Events" to set safariRunning to exists process "Safari"
				delay 0.1
				set wakeCounter to wakeCounter + 1
			end repeat
		end if
		
		tell application "System Events" to set currentPID to unix id of process "Safari" as text
		
		tell application "Safari"
			set tabReused to false
			set foundWindow to false
			
			if openMode is "Same Window New Tab" and (count of windows) > 0 then
				tell window 1
					make new tab at end of tabs with properties {URL:targetURL}
					set current tab to last tab
					if alwaysFocus is true then
						set visible to true
						set miniaturized to false
						set index to 1
					end if
				end tell
				set tabReused to true
			else if (storedPID is equal to currentPID) then
				try
					if exists window id storedID then
						tell window id storedID
							set foundWindow to true
							if openMode is "New Window New Tab" then
								make new tab at end of tabs with properties {URL:targetURL}
								set current tab to last tab
								set tabReused to true
							else if openMode contains "Update Tab" then
								if storedURL is not "" then
									set totalTabs to count of tabs
									repeat with i from 1 to totalTabs
										try
											if URL of tab i is equal to storedURL then
												set URL of tab i to targetURL
												set current tab to tab i
												set tabReused to true
												exit repeat
											end if
										end try
									end repeat
								end if
								if not tabReused and storedTabIndex > 0 then
									if (count of tabs) ≥ storedTabIndex then
										set URL of tab storedTabIndex to targetURL
										set current tab to tab storedTabIndex
										set tabReused to true
									end if
								end if
							end if
							if tabReused and alwaysFocus is true then
								set visible to true
								set miniaturized to false
								set index to 1
								tell application "Safari" to activate
							end if
						end tell
					end if
				on error
					set foundWindow to false
				end try
			end if
			
			-- 7. CREATE NEW WINDOW OR TAB
			if not tabReused then
				tell application "Safari" to activate
				if openMode contains "Same Window" and (count of windows) > 0 then
					tell window 1
						make new tab at end of tabs with properties {URL:targetURL}
						set current tab to last tab
					end tell
					set createdNewWindow to false
				else
					set initialWindowCount to count of windows
					make new document with properties {URL:targetURL}
					set createdNewWindow to true
					set timeoutCounter to 0
					repeat while (count of windows) is initialWindowCount
						delay 0.1
						set timeoutCounter to timeoutCounter + 1
						if timeoutCounter > 15 then exit repeat
					end repeat
					delay 0.1
				end if
				
				if createdNewWindow then
					try
						tell application "Finder" to set {dL, dT, dR, dB} to bounds of window of desktop
						if windowSize is "left" then
							set bounds of window 1 to {0, 25, dR / 2, dB}
						else if windowSize is "right" then
							set bounds of window 1 to {dR / 2, 25, dR, dB}
						else if windowSize is "top" then
							set bounds of window 1 to {0, 25, dR, dB / 2}
						else if windowSize is "bottom" then
							set bounds of window 1 to {0, dB / 2, dR, dB}
						else if windowSize is "center" then
							set bounds of window 1 to {dR * 0.15, dB * 0.15, dR * 0.85, dB * 0.85}
						else if windowSize is "custom" then
							set bounds of window 1 to customBounds
						else
							set bounds of window 1 to {0, 25, dR, dB}
						end if
					end try
				end if
			end if
			
			-- 8. SAVE EXACT WINDOW, URL & TAB STATE
			try
				set activeWinID to id of window 1
				set activeTabIndex to index of current tab of window 1
				do shell script "echo " & quoted form of currentPID & " > " & quoted form of cacheFile
				do shell script "echo " & quoted form of (activeWinID as string) & " >> " & quoted form of cacheFile
				do shell script "echo " & quoted form of targetURL & " >> " & quoted form of cacheFile
				do shell script "echo " & quoted form of (activeTabIndex as string) & " >> " & quoted form of cacheFile
			end try
		end tell
		
		-- 9. JUMP TO FRONT
		if alwaysFocus is true then
			tell application "Safari" to activate
			try
				tell application "System Events" to tell process "Safari"
					set frontmost to true
					perform action "AXRaise" of window 1
				end tell
			end try
		end if
		
	end timeout
	return input
end run
```
