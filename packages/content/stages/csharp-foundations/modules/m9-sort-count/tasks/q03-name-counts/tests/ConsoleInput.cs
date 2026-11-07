public static class ConsoleInput
{
    public static void With(string input, Action action)
    {
        TextReader original = Console.In;
        try
        {
            Console.SetIn(new StringReader(input));
            action();
        }
        finally
        {
            Console.SetIn(original);
        }
    }
}
