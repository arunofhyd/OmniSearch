# OmniSearch Native Logic (Safe & Production Ready)

This is the recommended, permission-free script currently in use. It includes URL sanitization for Apple tools and strict "Tab 1" targeting to protect your work.

## Features
1.  **Tab Safety**: Always uses **Tab 1** of the dedicated window.
2.  **WAF Compliance**: Automatically sanitizes URLs for `marketingtools.apple.com`.
3.  **Robustness**: Handles Safari restarts (PID check) and race conditions.

## The Script

```applescript
on run {input, parameters}
	-- Retrieve the target URL passed from the macOS Shortcuts input
	set targetURL to (item 1 of input) as string
	
	-- CONFIGURATION:
	-- Set to 'true' to always bring the search window to the front.
	-- Set to 'false' to update the tab in the background (if the window is already open).
	set alwaysFocus to true
	
	-- ==========================================
	-- URL SANITIZATION & WAF COMPLIANCE
	-- This block sanitizes all space variations into strict form-encoded spaces ("+") required by Apple Marketing Tools to bypass enterprise Web Application Firewalls (WAF) and prevent 403 errors, while leaving other domains untouched.
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
	
	-- Define the path for the temporary cache file used to persist the dedicated window ID
	set cacheFile to "/tmp/omnisearch_id.txt"
	set foundWindow to false
	
	-- PRE-FETCH CACHE DATA
	-- Parsing outside of the application block prevents namespace conflicts ("Expected end of line" errors)
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
				-- Direct ID targeting is faster and more reliable than iterating loops
				if exists window id storedID then
					tell window id storedID
						set foundWindow to true
						
						-- ISOLATED TAB ROUTING:
						if (count of tabs) > 0 then
							set URL of tab 1 to targetURL
							set current tab to tab 1
						else
							make new tab at end of tabs with properties {URL:targetURL}
						end if
						
						-- Force window out of the Dock and un-minimize
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
			
			set timeoutCounter to 0
			repeat while (count of windows) is initialWindowCount
				delay 0.1
				set timeoutCounter to timeoutCounter + 1
				if timeoutCounter > 15 then exit repeat
			end repeat
			
			delay 0.1
			
			try
				set bounds of window 1 to {1120, 25, 2240, 1260}
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
		tell application "Safari" to activate
	end if
	
	return input
end run
```
