public class S02PassNamesTests
{
    [Theory(DisplayName = "S02 入選者")]
    [InlineData("3 70\naki 70\nmei 60\nren 80\n", "aki\nren\n")]
    [InlineData("1 70\nmei 60\n", "none\n")]
    public void S02PassNames(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S02PassNames())));
    }
}
