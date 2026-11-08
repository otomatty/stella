public class Q02PrintLenAndTailTests
{
    [Fact(DisplayName = "Q02 長さと末尾")]
    public void Q02PrintLenAndTail()
    {
        Assert.Equal("4\n6\n", ConsoleOutput.Capture(() => Answers.Q02PrintLenAndTail("2026")));
        Assert.Equal("1\nA\n", ConsoleOutput.Capture(() => Answers.Q02PrintLenAndTail("A")));
    }
}
