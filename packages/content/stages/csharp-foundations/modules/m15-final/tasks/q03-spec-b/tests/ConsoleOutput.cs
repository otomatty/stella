public static class ConsoleOutput
{
    public static string Capture(Action action)
    {
        TextWriter original = Console.Out;
        StringWriter writer = new StringWriter();
        try
        {
            Console.SetOut(writer);
            action();
            return writer.ToString().Replace("\r\n", "\n");
        }
        finally
        {
            Console.SetOut(original);
        }
    }
}
