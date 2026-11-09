public class Q18EqOrNeTests
{
    [Theory(DisplayName = "Q18 同じなら eq")]
    [InlineData("4 4\n", "eq\n")]
    [InlineData("4 5\n", "ne\n")]
    [InlineData("0 0\n", "eq\n")]
    public void Q18EqOrNe(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q18EqOrNe())));
    }
}
