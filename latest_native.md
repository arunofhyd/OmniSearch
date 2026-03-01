# OmniSearch Native Logic (Safe & Production Ready)

## The Script

```applescript
on run {input, parameters}
	with timeout of 300 seconds
		-- 1. GET THE INPUT: 
		set searchTerm to (item 1 of input) as string
		
		-- ==========================================
		-- 2. FILE PATHS & MAGIC KEYWORDS
		-- ==========================================
		-- Create a visible, non-sandboxed folder in the Home directory
		set homeFolder to POSIX path of (path to home folder)
		set omniFolder to homeFolder & "OmniSearch/"
		do shell script "mkdir -p " & quoted form of omniFolder
		set prefsFile to omniFolder & "OmniSearch_Preferences.txt"
		
		-- MAGIC KEYWORDS: Super easy user management
		set isResetCommand to false
		if searchTerm contains "omnisettings" then
			try
				do shell script "open " & quoted form of prefsFile
			on error
				display dialog "Preferences file not found. Try searching for 'omnireset' to generate it." buttons {"OK"} default button "OK"
			end try
			return input
		else if searchTerm contains "omnireset" then
			try
				do shell script "rm " & quoted form of prefsFile
			end try
			set isResetCommand to true
		end if
		
		-- ==========================================
		-- 3. TERM EXTRACTOR (Handles full URLs passed from existing shortcuts)
		-- ==========================================
		set preSelectedEngine to ""
		set isDirectURL to false
		set oldDelims to AppleScript's text item delimiters
		
		if not isResetCommand then
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
				set isDirectURL to true
			end if
		end if
		set AppleScript's text item delimiters to oldDelims
		
		-- ==========================================
		-- 4. ONE-TIME SETUP WIZARD & USER PREFS
		-- ==========================================
		set isFirstRun to false
		
		-- DATA DRIVEN LOCALE LIST
		set localeData to {¬
			"en_US|🇺🇸", "en_GB|🇬🇧", "en_IN|🇮🇳", "en_CA|🇨🇦", "en_AU|🇦🇺", "en_NZ|🇳🇿", ¬
			"en_ZA|🇿🇦", "ar_SA|🇸🇦", "hi_IN|🇮🇳"}
		
		-- Default Variables
		set openMode to "New Window Update Tab"
		set windowSize to "fullscreen"
		set mktTargets to ""
		set musTargets to ""
		set googleTargets to ""
		
		if isResetCommand then
			set isFirstRun to true
		else
			try
				set cachedPrefs to do shell script "cat " & quoted form of prefsFile
				if cachedPrefs is "" then
					set isFirstRun to true
				else
					set prefLines to paragraphs of cachedPrefs
					set foundData to false
					
					repeat with p in prefLines
						if p starts with "Mode: " then
							set openMode to text 7 thru -1 of p
							set foundData to true
						else if p starts with "Size: " then
							set windowSize to text 7 thru -1 of p
						else if p starts with "Apple Marketing: " then
							set mktTargets to text 18 thru -1 of p
						else if p starts with "Apple Music: " then
							set musTargets to text 14 thru -1 of p
						else if p starts with "Google: " then
							set googleTargets to text 9 thru -1 of p
						end if
					end repeat
					
					if not foundData then set isFirstRun to true
				end if
			on error
				set isFirstRun to true
			end try
		end if
		
		-- ==========================================
		-- SETUP WIZARD
		-- ==========================================
		if isFirstRun then
			tell application (path to frontmost application as text)
				set welcomeText to "Welcome to OmniSearch! 🚀" & return & return
				set welcomeText to welcomeText & "Let's quickly set up your preferences."
				set welcomeResponse to display dialog welcomeText with title "OmniSearch Setup (1/5)" buttons {"Skip (Use Defaults)", "Let's Go!"} default button "Let's Go!" with icon note
				
				set validMkt to {"Apple Marketing (en_US) 🇺🇸"}
				set validMus to {"Apple Music (en_US) 🇺🇸"}
				set validGoog to {"Google (en_US) 🇺🇸"}
				
				if button returned of welcomeResponse is "Let's Go!" then
					set modeOptions to {"1. New Window Update Tab (Default) 🪟", "2. New Window New Tab 🗂️", "3. Same Window New Tab ➕", "4. Same Window Update Tab 🎯"}
					set chosenModeList to choose from list modeOptions with prompt ("How would you like OmniSearch to open your searches?" & return) default items {item 1 of modeOptions} with title "OmniSearch Setup (2/5)"
					if chosenModeList is not false then
						set chosenMode to item 1 of chosenModeList
						if chosenMode contains "New Window Update Tab" then set openMode to "New Window Update Tab"
						if chosenMode contains "New Window New Tab" then set openMode to "New Window New Tab"
						if chosenMode contains "Same Window New Tab" then set openMode to "Same Window New Tab"
						if chosenMode contains "Same Window Update Tab" then set openMode to "Same Window Update Tab"
					end if
					
					if openMode contains "New Window" then
						set sizeOptions to {"1. Fullscreen 🖥️", "2. Left Half ⬅️", "3. Right Half ➡️", "4. Top Half ⬆️", "5. Bottom Half ⬇️", "6. Center 🎯"}
						set chosenSizeList to choose from list sizeOptions with prompt ("Choose your preferred window size:" & return) default items {item 1 of sizeOptions} with title "OmniSearch Setup (3/5)"
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
					
					set engineOptions to {"1. Apple Marketing 📺", "2. Apple Music 🎵", "3. Google 🔍"}
					set chosenEnginesList to choose from list engineOptions with prompt ("Select the search engines you want to enable:" & return & "(Hold Command ⌘ to select multiple)" & return) default items {item 1 of engineOptions} with title "OmniSearch Setup (4/5)" with multiple selections allowed
					
					set cleanTargetList to {}
					if chosenEnginesList is not false then
						repeat with chosenEng in chosenEnginesList
							set oldDelims to AppleScript's text item delimiters
							set AppleScript's text item delimiters to " "
							set engPieces to text items of chosenEng
							set engName to items 2 thru -2 of engPieces as string
							set AppleScript's text item delimiters to oldDelims
							
							set filteredLocaleData to {}
							repeat with locItem in localeData
								if (engName contains "Apple") and (locItem contains "hi_IN") then
									-- Skip hi_IN for Apple services
								else
									set end of filteredLocaleData to locItem
								end if
							end repeat
							
							set totalLocales to count of filteredLocaleData
							set locOptions to {"0. [ADD ALL REGIONS] 🌍"}
							set optCounter to 1
							repeat with locItem in filteredLocaleData
								set oldDelims to AppleScript's text item delimiters
								set AppleScript's text item delimiters to "|"
								set locCode to text item 1 of locItem
								set locFlag to text item 2 of locItem
								set AppleScript's text item delimiters to oldDelims
								
								if optCounter is 1 and totalLocales > 9 then
									set numPrefix to "01"
								else
									set numPrefix to (optCounter as string)
								end if
								
								set end of locOptions to numPrefix & ". " & locCode & " " & locFlag
								set optCounter to optCounter + 1
							end repeat
							
							set chosenLocales to choose from list locOptions with prompt ("Select regions for " & engName & ":" & return & "(Hold Command ⌘ to select multiple)" & return) default items {item 2 of locOptions} with title "OmniSearch Setup (5/5)" with multiple selections allowed
							
							if chosenLocales is not false then
								set addAll to false
								repeat with checkLoc in chosenLocales
									if checkLoc contains "[ADD ALL REGIONS]" then set addAll to true
								end repeat
								
								if addAll then
									repeat with locItem in filteredLocaleData
										set oldDelims to AppleScript's text item delimiters
										set AppleScript's text item delimiters to "|"
										set pureCode to text item 1 of locItem
										set pureFlag to text item 2 of locItem
										set AppleScript's text item delimiters to oldDelims
										set end of cleanTargetList to engName & " (" & pureCode & ") " & pureFlag
									end repeat
								else
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
					
					set validMkt to {}
					set validMus to {}
					set validGoog to {}
					repeat with tgt in cleanTargetList
						if tgt starts with "Apple Marketing" then set end of validMkt to tgt as string
						if tgt starts with "Apple Music" then set end of validMus to tgt as string
						if tgt starts with "Google" then set end of validGoog to tgt as string
					end repeat
				end if
				
				if (count of validMkt) is 0 then set end of validMkt to "Apple Marketing (en_US) 🇺🇸"
				if (count of validMus) is 0 then set end of validMus to "Apple Music (en_US) 🇺🇸"
				if (count of validGoog) is 0 then set end of validGoog to "Google (en_US) 🇺🇸"
				
				set finishText to "Setup Complete! 🎉" & return & return
				set finishText to finishText & "Your settings have been saved to:" & return & "Home > OmniSearch > OmniSearch_Preferences.txt" & return & return
				set finishText to finishText & "💡 MAGIC SHORTCUTS:" & return
				set finishText to finishText & "• Search 'omnisettings' to quickly open this file." & return
				set finishText to finishText & "• Search 'omnireset' to run this setup wizard again." & return & return
				set finishText to finishText & "A copy of these details has been saved to your Desktop."
				
				set desktopFolder to POSIX path of (path to desktop folder)
				set detailsFile to desktopFolder & "OmniSearch Setup Details.txt"
				
				set fileContent to "=============================================" & return & ¬
					"         OmniSearch Configuration            " & return & ¬
					"=============================================" & return & return & ¬
					"The preferences file for OmniSearch is saved in:" & return & ¬
					"~/OmniSearch/OmniSearch_Preferences.txt" & return & return & ¬
					"You can go to this file by pressing ⌘ Shift G" & return & ¬
					"and pasting the path in it." & return & return & ¬
					"---------------------------------------------" & return & ¬
					"To open the preferences:" & return & ¬
					"🔍 Search 'omnisettings' directly in the shortcut" & return & return & ¬
					"To reset it:" & return & ¬
					"🔍 Search 'omnireset' in the shortcut directly" & return & return & ¬
					"Or 🗑️ Delete the preferences file from the path shown above" & return & return & ¬
					"============================================="
					
				do shell script "echo " & quoted form of fileContent & " > " & quoted form of detailsFile
				
				display dialog finishText with title "OmniSearch Setup Complete" buttons {"Awesome!"} default button "Awesome!" with icon note
				
				set oldDelims to AppleScript's text item delimiters
				set AppleScript's text item delimiters to "|"
				set mktTargets to validMkt as string
				set musTargets to validMus as string
				set googleTargets to validGoog as string
				set AppleScript's text item delimiters to oldDelims
			end tell -- END TELL BLOCK
			
			set prefData to "[OMNISEARCH CONFIGURATION]" & return & ¬
				"Mode: " & openMode & return & ¬
				"Size: " & windowSize & return & ¬
				"Apple Marketing: " & mktTargets & return & ¬
				"Apple Music: " & musTargets & return & ¬
				"Google: " & googleTargets
			
			do shell script "echo " & quoted form of prefData & " > " & quoted form of prefsFile
		end if
		
		-- If they only typed omnireset, we stop the script here so it doesn't search safari for "omnireset"
		if isResetCommand then return input
		
		-- ==========================================
		-- DATA VALIDATION & FALLBACK LOGIC
		-- ==========================================
		set validMkt to {}
		set validMus to {}
		set validGoog to {}
		
		set oldDelims to AppleScript's text item delimiters
		set AppleScript's text item delimiters to "|"
		
		if mktTargets is not "" then
			set tempItems to text items of mktTargets
			repeat with tgt in tempItems
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
		
		if (count of validMkt) is 0 then set end of validMkt to "Apple Marketing (en_US) 🇺🇸"
		if (count of validMus) is 0 then set end of validMus to "Apple Music (en_US) 🇺🇸"
		if (count of validGoog) is 0 then set end of validGoog to "Google (en_US) 🇺🇸"
		
		set userSavedTargetsList to validMkt & validMus & validGoog
		set customBounds to {100, 100, 1200, 800}
		set alwaysFocus to true
		set targetURL to ""
		
		-- ==========================================
		-- 5. SMART TARGET MENU & DYNAMIC URL GENERATOR
		-- ==========================================
		if isDirectURL then
			set targetURL to searchTerm
			
			-- FIX FOR INTERLINKED
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
			
			set uniqueEngines to {}
			repeat with tgt in userSavedTargetsList
				if tgt is not "" then
					if tgt starts with "Apple Marketing" and "Apple Marketing" is not in uniqueEngines then set end of uniqueEngines to "Apple Marketing"
					if tgt starts with "Apple Music" and "Apple Music" is not in uniqueEngines then set end of uniqueEngines to "Apple Music"
					if tgt starts with "Google" and "Google" is not in uniqueEngines then set end of uniqueEngines to "Google"
				end if
			end repeat
			
			set chosenEngine to ""
			
			if preSelectedEngine is not "" then
				set chosenEngine to preSelectedEngine
			else if (count of uniqueEngines) > 0 then
				set chosenEngine to item 1 of uniqueEngines
			else
				set chosenEngine to "Apple Marketing"
			end if
			
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
			
			set totalAvailableRegions to count of availableRegions
			if totalAvailableRegions > 1 and (chosenEngine is in {"Apple Marketing", "Apple Music", "Google"}) then
				set numberedRegions to {}
				set rCount to 1
				repeat with reg in availableRegions
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
				if chosenEngine contains "Apple Marketing" then set finalChosenTarget to "Apple Marketing (en_US) 🇺🇸"
				if chosenEngine contains "Apple Music" then set finalChosenTarget to "Apple Music (en_US) 🇺🇸"
				if chosenEngine contains "Google" then set finalChosenTarget to "Google (en_US) 🇺🇸"
			end if
			
			set isMarketing to finalChosenTarget contains "Apple Marketing"
			set isMusic to finalChosenTarget contains "Apple Music"
			set isGoogleSearch to finalChosenTarget contains "Google"
			
			set oldDelims to AppleScript's text item delimiters
			set AppleScript's text item delimiters to "("
			set temp1 to text item 2 of finalChosenTarget
			set AppleScript's text item delimiters to ")"
			set extractedLocale to text item 1 of temp1
			
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
		-- 6. SAFARI EXECUTION
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
		
		set activeWinID to 0
		set activeTabIndex to 0
		
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
			
			try
				set activeWinID to id of window 1
				set activeTabIndex to index of current tab of window 1
			end try
		end tell
		
		if activeWinID is not 0 then
			try
				do shell script "echo " & quoted form of currentPID & " > " & quoted form of cacheFile
				do shell script "echo " & quoted form of (activeWinID as string) & " >> " & quoted form of cacheFile
				do shell script "echo " & quoted form of targetURL & " >> " & quoted form of cacheFile
				do shell script "echo " & quoted form of (activeTabIndex as string) & " >> " & quoted form of cacheFile
			end try
		end if
		
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
