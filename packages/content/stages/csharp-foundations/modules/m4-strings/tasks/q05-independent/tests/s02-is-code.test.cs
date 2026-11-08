public class S02IsCodeTests
{
    [Fact(DisplayName = "S02 表記の条件")]
    public void S02IsCode()
    {
        Assert.Equal(true, Answers.S02IsCode("0123"));
        Assert.Equal(false, Answers.S02IsCode("12a4"));
        Assert.Equal(false, Answers.S02IsCode(""));
        Assert.Equal(false, Answers.S02IsCode("123"));
        Assert.Equal(true, Answers.S02IsCode("123456"));
        Assert.Equal(false, Answers.S02IsCode("1234567"));
    }
}
