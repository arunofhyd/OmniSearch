# OmniSearch Native Logic (With Auto-Updater)

This script includes all the safety features of the standard version but adds an **Automatic Update Checker**.
**Status:** Pending IT Permission. Use this only when authorized.

## Features
1.  **Auto-Update**: Checks `omniisearch.netlify.app/version.txt` for updates.
2.  **Configurable Frequency**: "always", "daily", or "weekly".
3.  **Tab Safety**: Uses the same safe "Tab 1" logic.

## The Script

```applescript
on run {input, parameters}
	-- Retrieve the target URL passed from the macOS Shortcuts input
	set targetURL to (item 1 of input) as string
	
	-- ==========================================
	-- CONFIGURATION & UPDATE SETTINGS
	-- ==========================================
	-- Set to 'true' to always bring the search window to the front.
	-- Set to 'false' to update the tab in the background (if the window is already open).
	set alwaysFocus to true
	
	-- Set updateFrequency to:
	-- "always" (check every run - best for testing)
	-- "daily"  (standard production setting)
	-- "weekly" (minimum intrusion)
	set updateFrequency to "always"
	set currentVersion to 1.0
	set cacheFile to "/tmp/omnisearch_id.txt"
	-- ==========================================
	
	-- ==========================================
	-- PRE-FETCH CACHE DATA
	-- Fetching early prevents namespace conflicts and allows the Updater to safely route
	-- ==========================================
	set storedPID to ""
	set storedID to 0
	try
		set cachedData to do shell script "cat " & quoted form of cacheFile
		set oldDelims to AppleScript's text item delimiters
		set AppleScript's text item delimiters to ","
		set storedPID to text item 1 of cachedData
		set storedID to (text item 2 of cachedData) as integer
		set AppleScript's text item delimiters to oldDelims
	on error
		-- Proceed with defaults if cache is missing
	end try
	
	-- ==========================================
	-- AUTOMATIC UPDATE CHECKER LOGIC
	-- This block handles silent background version checks against the Netlify-hosted version.txt
	-- ==========================================
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
			-- Pinging the server with a 2-second timeout for better reliability.
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
							-- FIX: Process tracking must happen in System Events, not Safari, to avoid syntax errors
							tell application "System Events"
								set currentSafariPID to unix id of process "Safari" as text
							end tell
							
							tell application "Safari"
								set updateTargetFound to false
								
								-- Specific check to see if OmniSearch window is open to prevent work loss
								if (storedPID is equal to currentSafariPID) and (storedID is not 0) then
									try
										if exists window id storedID then
											tell window id storedID
												set URL of tab 1 to "https://omniisearch.netlify.app"
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
	-- URL SANITIZATION & WAF COMPLIANCE
	-- This block sanitizes all space variations into strict form-encoded spaces ("+") required by Apple Marketing Tools
	-- ==========================================
	if targetURL contains "marketingtools.apple.com" then
		set oldDelims to AppleScript's text item delimiters
		set AppleScript's text item delimiters to {"%2520", "%20", " "}
		set urlPieces to text items of targetURL
		set AppleScript's text item delimiters to "+"
		set targetURL to urlPieces as string
		set AppleScript's text item delimiters to oldDelims
	end if
	-- ==========================================
	
	set foundWindow to false
	
	-- STEP 1: PROCESS ID TRACKING
	-- Check if Safari is running first.
	set safariRunning to false
	tell application "System Events"
		if exists process "Safari" then set safariRunning to true
	end tell
	
	-- If Safari is NOT running, we MUST activate it.
	-- If alwaysFocus is TRUE, we WANT to activate it immediately.
	if (safariRunning is false) or (alwaysFocus is true) then
		tell application "Safari" to activate
	end if
	
	tell application "System Events"
		set currentPID to unix id of process "Safari" as text
	end tell
	
	tell application "Safari"
		-- STEP 2: WINDOW VALIDATION & ROUTING
		if (storedPID is equal to currentPID) then
			try
				if exists window id storedID then
					tell window id storedID
						set foundWindow to true
						
						-- ISOLATED TAB ROUTING
						if (count of tabs) > 0 then
							set URL of tab 1 to targetURL
							set current tab to tab 1
						else
							make new tab at end of tabs with properties {URL:targetURL}
						end if
						
						if alwaysFocus is true then
							set visible to true
							set minimized to false
							set index to 1
						end if
					end tell
				end if
			on error
				set foundWindow to false
			end try
		end if
		
		-- STEP 3: WINDOW INSTANTIATION
		if not foundWindow then
			set initialWindowCount to count of windows
			make new document with properties {URL:targetURL}
			
			-- RACE CONDITION PREVENTION
			set timeoutCounter to 0
			repeat while (count of windows) is initialWindowCount
				delay 0.1
				set timeoutCounter to timeoutCounter + 1
				if timeoutCounter > 15 then exit repeat
			end repeat
			
			delay 0.1
			
			try
				-- Targeting window 1 specifically for bounds settings
				set bounds of window 1 to {0, 25, 2240, 1260}
				set newID to (get id of window 1)
				do shell script "echo " & quoted form of (currentPID & "," & (newID as string)) & " > " & quoted form of cacheFile
			end try
		end if
	end tell
	
	-- STEP 4: AGGRESSIVE FOCUS STEALING
	-- Performed outside the Safari block to ensure system-level command priority
	if alwaysFocus is true then
		tell application "System Events"
			tell process "Safari"
				set frontmost to true
				try
					-- AXRaise is the strongest method to pull a window from background spaces
					perform action "AXRaise" of window 1
				end try
			end tell
		end tell
		
		-- Always fire the standard activate as a reliable fallback
		tell application "Safari" to activate
	end if
	
	return input
end run
```
