public class Q01PrintLenAndHeadTests
{
    [Fact(DisplayName = "Q01 長さと先頭")]
    public void Q01PrintLenAndHead()
    {
        Assert.Equal("4\n2\n", ConsoleOutput.Capture(() => Answers.Q01PrintLenAndHead("2026")));
        Assert.Equal("1\nA\n", ConsoleOutput.Capture(() => Answers.Q01PrintLenAndHead("A")));
    }
}
